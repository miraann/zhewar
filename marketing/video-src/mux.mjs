// node mux.mjs <video.mp4> <audio.wav> <out.mp4> — adds the soundtrack to a rendered video
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
const [video, audio, out] = process.argv.slice(2);
execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', video, '-i', audio, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
  '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
console.log('wrote', out);
