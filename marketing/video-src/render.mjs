// Renders promo.html to video, frame by frame.
//   node render.mjs stills 1,6.5,20 [page.html]   → stills[-page]/<t>.png
//   node render.mjs video [workers] [page.html]   → out[-page]/video.mp4 (silent) + sfx.json
import puppeteer from 'puppeteer-core';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [mode = 'video', arg, PAGE = 'promo.html'] = process.argv.slice(2);
const SUFFIX = PAGE === 'promo.html' ? '' : '-' + PAGE.replace(/^promo-?/, '').replace(/\.html$/, '');
let STAGE = { w: 540, h: 960 };

// One browser per worker: Chrome throttles background tabs, which stalls
// screenshots in every tab but the focused one.
const browsers = [];
async function openPage() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    protocolTimeout: 120000,
    args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });
  browsers.push(browser);
  const page = (await browser.pages())[0] || await browser.newPage();
  await page.goto(pathToFileURL(path.join(HERE, PAGE)).href, { waitUntil: 'load' });
  STAGE = await page.evaluate(() => ({ w: window.STAGE_W || 540, h: window.STAGE_H || 960 }));
  await page.setViewport({ width: STAGE.w, height: STAGE.h, deviceScaleFactor: 2 });
  await page.evaluate(async () => {
    await document.fonts.load('700 20px Kurdish');
    await document.fonts.ready;
    init();
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  });
  // Embedded cuts (promo-feed.html shows promo-wide.html in an iframe) run on
  // the same timeline: init them, drop their own background, seek them too
  const subs = page.frames().filter(f => f !== page.mainFrame());
  for (const f of subs) await f.evaluate(async () => {
    await document.fonts.load('700 20px Kurdish');
    await document.fonts.ready;
    init();
    for (const id of ['bg', 'vignette']) document.getElementById(id)?.style.setProperty('display', 'none');
    document.documentElement.style.background = document.body.style.background = 'transparent';
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  });
  const cdp = await page.createCDPSession();
  const shot = async (t, format = 'jpeg') => {
    await page.evaluate(t => seek(t), t);
    for (const f of subs) await f.evaluate(t => seek(t), t);
    const { data } = await cdp.send('Page.captureScreenshot', {
      format, quality: format === 'jpeg' ? 95 : undefined, optimizeForSpeed: true,
      clip: { x: 0, y: 0, width: STAGE.w, height: STAGE.h, scale: 2 },
    });
    return Buffer.from(data, 'base64');
  };
  return { page, shot };
}

function run(cmd, args, input) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('close', code => code === 0 ? res() : rej(new Error(`${cmd} exited ${code}\n${err.slice(-2000)}`)));
    if (input) input(p);
  });
}

if (mode === 'stills') {
  const stillsDir = path.join(HERE, 'stills' + SUFFIX);
  fs.mkdirSync(stillsDir, { recursive: true });
  const { shot } = await openPage();
  for (const t of arg.split(',').map(Number)) {
    const t0 = Date.now();
    fs.writeFileSync(path.join(stillsDir, `${t.toFixed(2)}.png`), await shot(t, 'png'));
    console.log(`t=${t} ${Date.now() - t0}ms`);
  }
} else {
  const workers = Number(arg) || 4;
  const outDir = path.join(HERE, 'out' + SUFFIX);
  fs.mkdirSync(outDir, { recursive: true });
  const probe = await openPage();
  const { dur, sfx, music } = await probe.page.evaluate(() => ({ dur: DUR, sfx: SFX, music: window.MUSIC || null }));
  await probe.page.close();
  fs.writeFileSync(path.join(outDir, 'sfx.json'), JSON.stringify({ dur, sfx, music }, null, 1));
  const total = Math.round(dur * FPS);
  const per = Math.ceil(total / workers);
  let done = 0;
  const started = Date.now();

  const chunk = async (w) => {
    const a = w * per, b = Math.min(total, a + per);
    if (a >= b) return null;
    const file = path.join(outDir, `part${w}.mp4`);
    const { shot } = await openPage();
    await run(ffmpegPath, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), file], async (p) => {
      for (let f = a; f < b; f++) {
        const buf = await shot(f / FPS);
        if (!p.stdin.write(buf)) await new Promise(r => p.stdin.once('drain', r));
        done++;
        if (done % 60 === 0) {
          const el = (Date.now() - started) / 1000;
          console.log(`${done}/${total} frames  ${el.toFixed(0)}s  eta ${(el / done * (total - done)).toFixed(0)}s`);
        }
      }
      p.stdin.end();
    });
    return file;
  };
  const parts = (await Promise.all(Array.from({ length: workers }, (_, w) => chunk(w)))).filter(Boolean);
  const list = path.join(outDir, 'parts.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
  await run(ffmpegPath, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(outDir, 'video.mp4')]);
  parts.forEach(p => fs.unlinkSync(p)); fs.unlinkSync(list);
  console.log(`video done in ${((Date.now() - started) / 1000).toFixed(0)}s → ${path.relative(HERE, outDir)}/video.mp4`);
}
await Promise.all(browsers.map(b => b.close()));
