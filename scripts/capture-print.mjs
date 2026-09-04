/* Render the clinician handoff the way a printer would. The print path is a
   shipped output; leaving it unrendered means the claim is untested. */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:5199';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, re) {
  for (const b of await page.locator('button').all()) {
    if (re.test((await b.textContent())?.trim() ?? '')) { await b.click(); return true; }
  }
  return false;
}
async function rate(page, vals) {
  const gs = await page.locator('[role="radiogroup"]').all();
  for (let i = 0; i < gs.length; i++) {
    const inputs = await gs[i].locator('input').all();
    await inputs[vals[i] ?? 2]?.check({ force: true });
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle' });
await clickText(page, /begin screening/i); await wait(400);
await clickText(page, /go on/i); await wait(400);
await rate(page, [4, 3, 1, 2]); await wait(200);
await clickText(page, /start the seven tasks/i); await wait(400);
for (let i = 0; i < 7; i++) {
  await clickText(page, /start this task/i); await wait(300);
  if (!(await clickText(page, /it doubled/i))) await clickText(page, /end this task early/i);
  await wait(300);
  await rate(page, i === 3 ? [7, 6, 2, 3] : [4, 3, 1, 2]); await wait(200);
  await clickText(page, /next task|see findings/i); await wait(350);
}
await wait(600);

await page.emulateMedia({ media: 'print' });
await wait(300);
await page.screenshot({ path: '.impeccable/review/print-findings.png', fullPage: true });
await page.pdf({ path: '.impeccable/review/handoff.pdf', format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' } });
console.log('print captured');
await browser.close();
