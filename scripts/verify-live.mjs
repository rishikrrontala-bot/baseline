import { chromium } from 'playwright';
const BASE = process.argv[2];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));

const click = async (re) => {
  for (const b of await page.locator('button').all())
    if (re.test((await b.textContent())?.trim() ?? '')) { await b.click(); return true; }
  return false;
};
const rate = async (v) => {
  for (const g of await page.locator('[role="radiogroup"]').all())
    await (await g.locator('input').all())[v]?.check({ force: true });
};

await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle' });
console.log('title:', await page.title());
console.log('h1:', (await page.locator('h1').first().textContent())?.trim().replace(/\s+/g, ' '));
await click(/begin screening/i); await wait(500);
console.log('threshold:', (await page.locator('li').first().textContent())?.trim());
await click(/go on/i); await wait(500);
await rate(2); await wait(200);
await click(/start the seven tasks/i); await wait(500);
for (let i = 0; i < 7; i++) {
  await click(/start this task/i); await wait(350);
  if (!(await click(/it doubled/i))) await click(/end this task early/i);
  await wait(350);
  await rate(i === 3 ? 5 : 2); await wait(150);
  await click(/next task|see findings/i); await wait(400);
}
await wait(800);
console.log('findings heading:', (await page.locator('h2').first().textContent())?.trim().replace(/\s+/g, ' '));
console.log('save controls present:', await page.locator('button', { hasText: /save as a screening/i }).count());
await click(/save as a screening/i); await wait(600);
console.log('history persisted:', await page.evaluate(() =>
  JSON.parse(localStorage.getItem('baseline.history.v1') || '{}')?.records?.length ?? 0));
await page.screenshot({ path: '.impeccable/review/live-findings.png', fullPage: true });
console.log('console errors:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
