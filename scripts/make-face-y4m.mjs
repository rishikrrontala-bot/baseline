/* Build a Y4M of the test portrait so Chromium's fake capture device can feed
   a real face into the VIDEO-mode pipeline. No ffmpeg needed. */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const W = 640, H = 480, FRAMES = 60;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:5199/');
const rgba = await page.evaluate(async ({ W, H }) => {
  const blob = await (await fetch('/mp/test-face.jpg')).blob();
  const bmp = await createImageBitmap(blob);
  const c = new OffscreenCanvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
  const s = Math.min(W / bmp.width, H / bmp.height);
  const dw = bmp.width * s, dh = bmp.height * s;
  g.drawImage(bmp, (W - dw) / 2, (H - dh) / 2, dw, dh);
  return Array.from(g.getImageData(0, 0, W, H).data);
}, { W, H });
await browser.close();

const yp = Buffer.alloc(W * H), up = Buffer.alloc((W / 2) * (H / 2)), vp = Buffer.alloc((W / 2) * (H / 2));
const at = (x, y) => { const i = (y * W + x) * 4; return [rgba[i], rgba[i + 1], rgba[i + 2]]; };
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const [r, g, b] = at(x, y);
  yp[y * W + x] = Math.max(0, Math.min(255, 0.299 * r + 0.587 * g + 0.114 * b));
}
for (let y = 0; y < H / 2; y++) for (let x = 0; x < W / 2; x++) {
  let R = 0, G = 0, B = 0;
  for (const [dx, dy] of [[0,0],[1,0],[0,1],[1,1]]) { const [r,g,b] = at(x*2+dx, y*2+dy); R+=r; G+=g; B+=b; }
  R/=4; G/=4; B/=4;
  const i = y * (W / 2) + x;
  up[i] = Math.max(0, Math.min(255, -0.169*R - 0.331*G + 0.5*B + 128));
  vp[i] = Math.max(0, Math.min(255,  0.5*R - 0.419*G - 0.081*B + 128));
}
const frame = Buffer.concat([Buffer.from('FRAME\n'), yp, up, vp]);
const out = [Buffer.from(`YUV4MPEG2 W${W} H${H} F30:1 Ip A1:1 C420mpeg2\n`)];
for (let i = 0; i < FRAMES; i++) out.push(frame);
writeFileSync('/tmp/face.y4m', Buffer.concat(out));
console.log('wrote /tmp/face.y4m', Buffer.concat(out).length, 'bytes');
