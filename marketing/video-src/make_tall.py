"""Builds promo-tall.html — the 9:16 cut WITH the homepage tour (gallery + social posts) —
by patching promo.html (the original 9:16 booking cut). Re-run after editing promo.html."""
s = open('promo.html', encoding='utf-8').read()

def rep(a, b, count=1):
    global s
    n = s.count(a)
    assert n == count, f'expected {count} match(es), found {n}: {a[:90]!r}'
    s = s.replace(a, b)

# ── CSS: homepage tour (carousel cards are .pcard; .card is the booking card) ──
rep('</style>', """
/* homepage tour: hero + gallery + social posts, with the site's sticky nav */
.hsec{position:relative;height:695px;display:flex;flex-direction:column;justify-content:center;overflow:hidden}
.haddr{font-size:13px;color:#a3a3a3;font-weight:500}
.sec-in{position:relative;padding:80px 0}
.sec-div{position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(to right,transparent,#e5e5e5,transparent)}
.sec-hd{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:12px}
.sec-lbl{font-size:10px;color:#a3a3a3}
.sec-hd i{display:block;width:32px;height:1px;background:#d4d4d4}
.sec-h2{font-size:48px;font-weight:700;color:#171717;line-height:1;text-align:center}
.car{position:relative;overflow:hidden;width:360px;direction:ltr}
.track{display:flex}
.pcard{flex-shrink:0;width:280.8px;height:374.4px;margin-right:14.4px;border-radius:24px;overflow:hidden;position:relative;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);border:1px solid #f5f5f5}
.pcard img{width:100%;height:100%;object-fit:cover}
.shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.5),rgba(0,0,0,0) 50%)}
.cbord{position:absolute;inset:0;border-radius:24px;border:2px solid rgba(96,165,250,.6)}
.cap{position:absolute;bottom:16px;right:16px;left:16px;text-align:right;direction:rtl}
.cap p{color:#fff;font-size:14px;font-weight:500}
.cap i{display:block;width:32px;height:1px;background:#60a5fa;margin-top:6px;margin-right:auto}
.cdots{display:flex;justify-content:center;gap:14px;margin-top:24px;direction:ltr}
.cdots span{display:block;height:6px;border-radius:3px}
.hnav{position:absolute;left:0;right:0;top:0;z-index:4}
.hnbar{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid transparent}
.hnlogo{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:700;color:#171717}
.hnring{width:32px;height:32px;border-radius:50%;padding:2px;background:conic-gradient(#ef4444 0deg,#ef4444 120deg,#f8fafc 145deg,#3b82f6 170deg,#3b82f6 300deg,#f8fafc 325deg,#ef4444 360deg)}
.hnring .w{width:100%;height:100%;border-radius:50%;background:#fff}
.hndl{display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:12px;background:#2563eb;color:#fff;font-size:14px;font-weight:700}
.chip{display:inline-flex;align-items:center;gap:8px;padding:7px 16px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);font-size:16px;font-weight:700;color:#e2e8f0}
</style>""")

# ── timeline: freeze the booking flow ("b-time") at SHOW_A for the tour ──
rep('const DUR = 66.6;', """const SHOW_A = 11.3, D = 12.5, SHOW_END = SHOW_A + D;
const DUR = 66.6 + D;
const warp = t => t < SHOW_A ? t : t < SHOW_END ? SHOW_A : t - D;
const unwarp = b => b < SHOW_A ? b : b + D;
let RT = 0;   // real time — for looping motion that must keep moving while b-time is frozen
window.STAGE_W = 540; window.STAGE_H = 960;""")
rep("const SEL_TIME = formatTimeFull(SLOTS[SEL_SLOT]);", """const SEL_TIME = formatTimeFull(SLOTS[SEL_SLOT]);
const TAGLINE = 'لێرە کوالێتی و وردەکاری کۆدەبنەوە';
const ADDRESS = 'سلێمانی - نزیک شاری سپی';
const GAL = ['ستایلی مۆدێرن', 'بریندنی تایبەت', 'فەیدی کلاسیکی', 'چاکردنی ڕیش', 'فەیدی مۆدیرین'];
const N_SOC = 4;""")
rep("""  { id: 'fNote',  str: NOTE,   a: 36.2, b: 36.9 },
];""", """  { id: 'fNote',  str: NOTE,   a: 36.2, b: 36.9 },
];
// homepage tour (real time)
const GAL_SW = [13.9, 15.25, 16.6], SOC_SW = [19.3, 20.65, 22.0];
const SCROLLS = [[12.2, .8, 0, 695], [17.6, .8, 695, 1390], [22.85, .8, 1390, 0]];
const GEST = [
  { k: 'up', a: 12.05, b: 12.5 },
  ...GAL_SW.map(s => ({ k: 'left', a: s - .35, b: s, id: 'g' })),
  { k: 'up', a: 17.45, b: 17.9 },
  ...SOC_SW.map(s => ({ k: 'left', a: s - .35, b: s, id: 's' })),
  { k: 'tap', a: 22.75, b: 22.75, id: 'hNavLogo' },
];""")
rep("const sfx = (name, t, vol = 1) => SFX.push({ name, t: +t.toFixed(3), vol });",
    """const sfx = (name, t, vol = 1) => SFX.push({ name, t: +unwarp(t).toFixed(3), vol });   // b-time cue
const sfxR = (name, t, vol = 1) => SFX.push({ name, t: +t.toFixed(3), vol });          // real-time cue
const MUSIC = { groove0: 5.0, scanA: unwarp(18.35), scanB: unwarp(26.65), gap: [unwarp(26.42), unwarp(26.65)], outro: unwarp(60.6) };""")
rep("  sfx('whoosh', 9.75, .7); sfx('whoosh', TL.s1, .8);", """  sfx('whoosh', 9.75, .7); sfx('whoosh', TL.s1, .8);
  sfxR('pop', 12.5, .5); sfxR('pop', 17.85, .5);
  SCROLLS.forEach(([a]) => sfxR('whoosh', a, .5));
  [...GAL_SW, ...SOC_SW].forEach(s => sfxR('swipe', s - .12, .8));
  sfxR('tap', 22.75, 1);""")

# ── copy: intro, hook, step 1, outro ──
rep('>سیستەمی زیرەکی تۆمارکردنی کات</div>', '>بەخێربێن بۆ سەرتاشخانەی</div>')
rep('ستایلێکی نوێ، متمانەیەکی نوێ', '${TAGLINE}', count=2)
rep('style="top:292px">کاتی سەردانیکردنەکەت</div>', 'style="top:292px">هەموو شتێک لە یەک شوێن</div>')
rep('style="top:348px">لە <span class="grad">چەند چرکەیەکدا</span> تۆمار بکە</div>', 'style="top:348px">ببینە، <span class="grad">تۆمار بکە</span></div>')
rep('color:#94a3b8">تەنها بە چەند هەنگاوێکی سادە</div>', 'color:#94a3b8">کارەکانمان، پۆستەکانمان و تۆمارکردنی کات</div>')
rep("[['scan-face','سکانی ڕووخسار'],['user','زانیارییەکانت'],['calendar','ڕۆژ و کات'],['circle-check-big','پەسەندکردن']]",
    "[['images','کارەکانمان'],['share-2','سۆشیاڵ میدیا'],['scan-face','سکانی ڕووخسار'],['calendar','تۆمارکردن']]")
rep("if (i === 0) { // highlight the face-scan node", "if (i === 2) { // highlight the face-scan node")
rep("$('rm0')", "$('rm2')", count=3)
rep("""${hdr('h1', 1, 'یەکەم', 'سەردانی <span class="grad lat">zhewar.shop</span> بکە',""",
    """${hdr('h1', 1, 'یەکەم', 'دەست بکە بە <span class="grad">تۆمارکردن</span>',""")
hv = lambda id, icon, label, title, sub: (f'<div class="hdr" id="{id}"><div class="pill"><span class="pn">${{ic(\'{icon}\', 14)}}</span>'
                                          f'<span>{label}</span></div><div class="ht">{title}</div><div class="hs">{sub}</div></div>')
rep("  ${hdr('h6', 6,", "  " + hv('hv0', 'globe', 'ماڵپەڕ', 'سەردانی <span class="grad lat">zhewar.shop</span> بکە', 'ماڵپەڕی فەرمیی سەرتاشخانەکە')
    + "\n  " + hv('hv1', 'images', 'گالری', '<span class="grad">کارەکانمان</span> ببینە', 'فەید، ستایلی مۆدێرن و چاکردنی ڕیش')
    + "\n  " + hv('hv2', 'share-2', 'سۆشیاڵ میدیا', 'دوایین <span class="grad">پۆستەکانمان</span>', 'ڕاستەوخۆ لە پەیجەکانمانەوە')
    + "\n  ${hdr('h6', 6,")
rep("""color:#94a3b8">تەنها بە یەک چاوتروکاندن</div>""",
    """color:#94a3b8">تەنها بە یەک چاوتروکاندن</div>
    <div id="oAddr" class="A" style="left:0;right:0;top:750px;display:flex;justify-content:center"><span class="chip">📍 ${ADDRESS}</span></div>""")
rep("it('oTag', 62.4); it('oSub', 62.7);", "it('oTag', 62.4); it('oSub', 62.7); it('oAddr', 63.0);")

# ── phone: the homepage becomes a scrollable page (hero → gallery → social) under the site nav ──
a = s.index('        <div class="scr" id="scHome"><div class="home">')
b = s.index('        <!-- registration: scan step -->')
s = s[:a] + """        <div class="scr" id="scHome">
          <div id="hScroll" class="A" style="left:0;top:0;width:360px">
            <section class="hsec" style="display:block">
              <div class="home" style="padding:66px 30px 30px">
                ${logoRing('homeRing', 170)}
                <div class="hname">${SHOP}</div>
                <div class="hdiv"><i style="background:linear-gradient(to right,transparent,#ef4444)"></i><span class="diamond" style="background:#a3a3a3;width:6px;height:6px"></span><i style="background:linear-gradient(to left,transparent,#3b82f6)"></i></div>
                <div class="htag" style="text-align:center">${TAGLINE}</div>
                <div class="btn blue" id="btnBook" style="margin-top:4px">${ic('calendar-plus', 20)}<span>ناو تۆمار کردن</span></div>
                <div class="hsmall">کلیک بکە بۆ بیبنی کاتی سەردانیکردن</div>
                <div class="btn red">${ic('search', 16)}<span>بینین و دڵنیاکردنەوەی کاتی سەردانیکردن</span></div>
                <div class="haddr">📍 ${ADDRESS}</div>
              </div>
            </section>
            <section class="hsec"><div class="sec-in"><div class="sec-div"></div>
              <div class="sec-hd"><span class="sec-lbl">کارەکانمان</span><i></i></div>
              <div style="height:40px"></div>
              <div class="car" id="gCar"><div class="track" id="gTrack">${pcards('g', GAL.length, GAL)}</div></div>
              <div class="cdots">${pdots('g', GAL.length)}</div>
            </div></section>
            <section class="hsec"><div class="sec-in"><div class="sec-div"></div>
              <div class="sec-hd"><span class="sec-lbl">پۆستەکانی</span><i></i></div>
              <div class="sec-h2">سۆشیاڵ میدیا</div>
              <div style="height:40px"></div>
              <div class="car" id="sCar"><div class="track" id="sTrack">${pcards('s', N_SOC, null)}</div></div>
              <div class="cdots">${pdots('s', N_SOC)}</div>
            </div></section>
          </div>
          <div class="hnav">
            <div class="pole" id="hPole"></div>
            <div class="hnbar" id="hNavBar">
              <div class="hnlogo" id="hNavLogo"><div class="hnring"><div class="w fx">${ic('scissors', 13, 'color:#2563eb')}</div></div><span>${SHOP}</span></div>
              <div class="hndl">${ic('download', 16)}<span>دابەزاندنی بەرنامە</span></div>
            </div>
          </div>
        </div>

""" + s[b:]
rep("""  const skels = Array.from""", """  const pcards = (p, n, caps) => Array.from({ length: n }, (_, i) => `
    <div class="pcard" id="${p}c${i}"><img src="site/${p}${i}.jpg"><div class="shade"></div><div class="cbord" id="${p}b${i}"></div>
      ${caps ? `<div class="cap"><p>${caps[i]}</p><i></i></div>` : ''}</div>`).join('');
  const pdots = (p, n) => Array.from({ length: n }, (_, i) => `<span id="${p}d${i}"></span>`).join('');
  const skels = Array.from""")
rep('<div class="screen"><div class="lg360">', '<div class="screen" id="pScreen"><div class="lg360">')

# ── per-frame: run the booking flow on b-time, the tour + loops on real time ──
rep("""function seek(t) {
  bgU(t); introU(t); hookU(t); hdrU(t); phoneU(t); scanU(t); notifU(t); outroU(t); tapU(t);
  vis('flash', t >= SC.flash && t < SC.flash + .5 ? .8 * (1 - P(t, SC.flash, .45, E.out)) : 0);""",
"""function seek(t) {
  RT = t;
  const b = warp(t);
  bgU(t, b); introU(b); hookU(b); hdrU(b); phoneU(b); scanU(b); notifU(b); outroU(b); tapU(b); showU(t);
  vis('flash', b >= SC.flash && b < SC.flash + .5 ? .8 * (1 - P(b, SC.flash, .45, E.out)) : 0);""")
rep("function bgU(t) {", "function bgU(t, b) {")
rep("vis('blobG', Math.max(1 - P(t, 4.6, 1), P(t, TL.outro, 1)));", "vis('blobG', Math.max(1 - P(b, 4.6, 1), P(b, TL.outro, 1)));")
rep("vis('bgScan', env(t, SC.zoom, SC.flyEnd, .8, .9));", "vis('bgScan', env(b, SC.zoom, SC.flyEnd, .8, .9));")
rep("""  let y = 0, s = 1, o = 1, rotY = Math.sin(t * .6) * 3, rotX = Math.cos(t * .5) * 1.5;
  const fl = Math.sin(t * 1.2) * 4;""", """  let y = 0, s = 1, o = 1, rotY = Math.sin(RT * .6) * 3, rotX = Math.cos(RT * .5) * 1.5;
  const fl = Math.sin(RT * 1.2) * 4;""")
rep("$('appStripes').style.backgroundPosition = `${(t * 6) % 141}px ${(t * 6) % 141}px`;",
    "$('appStripes').style.backgroundPosition = `${(RT * 6) % 141}px ${(RT * 6) % 141}px`;\n  $('hPole').style.backgroundPosition = `${(RT * 47) % 113}px 0`;")
rep("tf('homeRing', `rotate(${t * 360 / 3.5}deg)`);", "tf('homeRing', `rotate(${RT * 360 / 3.5}deg)`);")
rep("tf('regRing', `rotate(${t * 360 / 4}deg)`);", "tf('regRing', `rotate(${RT * 360 / 4}deg)`);")
rep("tf('formRing', `rotate(${t * 360 / 4}deg)`);", "tf('formRing', `rotate(${RT * 360 / 4}deg)`);")
rep("vis('segs', env(t, TL.s1, TL.outro, .5, .5));", "vis('segs', env(t, TL.s1, TL.outro, .5, .5) * P(RT, SHOW_END - .1, .5));")
rep("""    if (id === 'h6') o *= 1 - nf;
    vis(id, o);
    tf(id, `translateY(${(1 - P(t, a, .5)) * 18}px)`);""", """    if (id === 'h6') o *= 1 - nf;
    if (id === 'h1') o *= P(RT, SHOW_END - .1, .5);   // step 1 starts after the homepage tour
    vis(id, o);
    tf(id, `translateY(${(1 - (id === 'h1' ? P(RT, SHOW_END, .5) : P(t, a, .5))) * 18}px)`);""")
rep("  if (!tp) { vis('tap', 0); return; }", "  if (!tp || (RT >= SHOW_A && RT < SHOW_END)) { vis('tap', 0); return; }")
rep("  seek(SC.flyEnd);", "  seek(unwarp(SC.flyEnd));")
rep("window.DUR = DUR; window.SFX = SFX;", "window.DUR = DUR; window.SFX = SFX; window.MUSIC = MUSIC;")

# ── tour choreography (real time) ──
rep("function init() {", """// ── homepage tour (real time) ───────────────────────────────────────────────
const CARD_STEP = 280.8 + 14.4, CARD_EDGE = 39.6;
const carIdx = (t, sw) => sw.reduce((x, s) => x + P(t, s, .45, E.out), 0);
const mix = (c1, c2, a) => `rgb(${c1.map((v, i) => Math.round(lerp(v, c2[i], a))).join(',')})`;
function carousel(p, x, n) {
  tf(p + 'Track', `translateX(${CARD_EDGE - x * CARD_STEP}px)`);
  for (let i = 0; i < n; i++) {
    const a = clamp(1 - Math.abs(i - x));
    const c = $(p + 'c' + i);
    c.style.opacity = lerp(.4, 1, a); c.style.transform = `scale(${lerp(.97, 1, a)})`;
    $(p + 'b' + i).style.opacity = a;
    const d = $(p + 'd' + i);
    d.style.width = lerp(6, 24, a) + 'px'; d.style.background = mix([212, 212, 212], [37, 99, 235], a);
  }
}
function gestureU(t) {
  const g = GEST.find(x => t >= x.a - .3 && t <= x.b + .35);
  if (!g) return;
  let x, y, o, press = 0, rip = -1;
  if (g.k === 'tap') {
    const r = $(g.id).getBoundingClientRect();
    const ap = P(t, g.b - .5, .4), out = P(t, g.b + .15, .25, E.in);
    x = r.left + r.width / 2 + (1 - ap) * 24; y = r.top + r.height / 2 + (1 - ap) * 40;
    o = ap * (1 - out); press = bump(t, g.b, .12);
    if (t >= g.b) rip = P(t, g.b, .45);
  } else {
    const r = (g.k === 'up' ? $('pScreen') : $(g.id + 'Car')).getBoundingClientRect();
    const m = P(t, g.a, g.b - g.a, E.io);
    if (g.k === 'up') { x = r.left + r.width * .58; y = lerp(r.top + r.height * .78, r.top + r.height * .36, m); }
    else { x = lerp(r.left + r.width * .82, r.left + r.width * .28, m); y = r.top + r.height * .55; }
    o = P(t, g.a - .3, .3) * (1 - P(t, g.b, .3, E.in));
    press = t >= g.a && t <= g.b ? 1 : 0;
  }
  vis('tap', o);
  tf('tap', `translate(${x}px,${y}px)`);
  tf('tapDot', `scale(${1 - press * .18})`);
  vis('tapRip', rip >= 0 ? (1 - rip) * .9 : 0); tf('tapRip', `scale(${1 + Math.max(0, rip) * 1.4})`);
}
function showU(t) {
  if (t < TL.s1 || t > SHOW_END + 1) { ['hv0', 'hv1', 'hv2'].forEach(id => vis(id, 0)); return; }
  [['hv0', 10.4, 12.45], ['hv1', 12.45, 17.8], ['hv2', 17.8, 23.0]].forEach(([id, a, e]) => {
    vis(id, env(t, a, e, .5, .35)); tf(id, `translateY(${(1 - P(t, a, .5)) * 18}px)`);
  });
  let y = 0;
  SCROLLS.forEach(([a, d, y0, y1]) => { if (t >= a) y = lerp(y0, y1, P(t, a, d, E.io)); });
  tf('hScroll', `translateY(${-y}px)`);
  const sc = clamp(y / 300);
  $('hNavBar').style.background = `rgba(255,255,255,${.92 * sc})`;
  $('hNavBar').style.borderBottomColor = `rgba(229,229,229,${sc})`;
  $('hNavBar').style.boxShadow = `0 1px 2px rgba(0,0,0,${.05 * sc})`;
  carousel('g', carIdx(t, GAL_SW), GAL.length);
  carousel('s', carIdx(t, SOC_SW), N_SOC);
  gestureU(t);
}

function init() {""")

open('promo-tall.html', 'w', encoding='utf-8').write(s)
print('promo-tall.html written,', s.count('\n'), 'lines')
