/* Run a real camera screening and read back the objective measures. */
import { chromium } from 'playwright';
const BASE = 'http://localhost:5199';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: [
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
  '--use-file-for-fake-video-capture=/tmp/face.y4m',
]});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

const click = async (re) => {
  for (const b of await page.locator('button').all())
    if (re.test((await b.textContent())?.trim() ?? '')) { await b.click(); return true; }
  return false;
};
const rate = async (v) => {
  for (const g of await page.locator('[role="radiogroup"]').all())
    await (await g.locator('input').all())[v]?.check({ force: true });
};

await click(/begin screening/i); await wait(400);
await click(/go on/i); await wait(600);
await click(/turn the camera on/i); await wait(4000);
console.log('camera:', (await page.locator('[role="status"]').first().textContent())?.trim());
await rate(1); await wait(200);
await click(/start the seven tasks/i); await wait(500);

for (let i = 0; i < 7; i++) {
  await click(/start this task/i);
  await wait(8000);
  if (!(await click(/it doubled/i))) await click(/end this task early/i);
  await wait(500);
  await rate(1); await wait(150);
  await click(/next task|see findings/i); await wait(500);
}
await wait(1200);
const band = await page.evaluate(() => {
  const h = [...document.querySelectorAll('h3')].find((x) => /what the camera measured/i.test(x.textContent));
  if (!h) return null;
  const wrap = h.parentElement;
  return {
    headline: wrap.querySelector('p')?.textContent?.trim(),
    rows: [...wrap.querySelectorAll('dl > div')].map((d) => d.textContent.replace(/\s+/g, ' ').trim().slice(0, 150)),
  };
});
console.log(JSON.stringify(band, null, 2));
await page.screenshot({ path: '.impeccable/review/desktop-objectives.png', fullPage: true });
await browser.close();
