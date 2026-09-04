/* Reproduce the camera pipeline headlessly with a synthetic capture device. */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:5199';
const FACE = process.argv[3]; // optional y4m fed as the fake camera
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
if (FACE) args.push(`--use-file-for-fake-video-capture=${FACE}`);

const browser = await chromium.launch({ args });
const ctx = await browser.newContext({ permissions: ['camera'], viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

// Surface whatever getUserMedia actually rejects with, which the app swallows.
await page.addInitScript(() => {
  const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  window.__gum = [];
  navigator.mediaDevices.getUserMedia = async (c) => {
    try { const s = await orig(c); window.__gum.push({ ok: true, tracks: s.getVideoTracks().map(t => t.label) }); return s; }
    catch (e) { window.__gum.push({ ok: false, name: e.name, message: e.message }); throw e; }
  };
});

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
for (const re of [/begin screening/i, /go on/i]) {
  for (const b of await page.locator('button').all()) {
    if (re.test((await b.textContent())?.trim() ?? '')) { await b.click(); break; }
  }
  await wait(500);
}
const turnOn = page.locator('button', { hasText: /turn the camera on/i });
console.log('camera button present:', await turnOn.count());
await turnOn.first().click();

for (const t of [1000, 2000, 3000, 4000, 6000, 9000]) {
  await wait(t === 1000 ? 1000 : 1500);
  const status = (await page.locator('[role="status"]').first().textContent())?.trim();
  const info = await page.evaluate(() => {
    const v = document.querySelector('video');
    return { readyState: v?.readyState, vw: v?.videoWidth, vh: v?.videoHeight,
             paused: v?.paused, hasSrc: !!v?.srcObject, gum: window.__gum };
  });
  console.log(`t+${t}ms status="${status}" video=${JSON.stringify(info)}`);
}
console.log('--- console ---'); logs.slice(-25).forEach(l => console.log(l));
await browser.close();
