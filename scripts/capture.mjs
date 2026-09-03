/* Review captures: walk the real flow and write one PNG per surface.
   Run with the dev server up:  node scripts/capture.mjs [baseUrl] */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.argv[2] ?? 'http://localhost:5199';
const OUT = '.impeccable/review';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, re) {
  const btns = await page.locator('button').all();
  for (const b of btns) {
    const t = (await b.textContent())?.trim() ?? '';
    if (re.test(t)) {
      await b.click();
      return true;
    }
  }
  return false;
}

async function rate(page, vals) {
  const groups = await page.locator('[role="radiogroup"]').all();
  for (let i = 0; i < groups.length; i++) {
    const inputs = await groups[i].locator('input').all();
    await inputs[vals[i] ?? 2]?.check({ force: true });
  }
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log('captured', name);
}

async function run(viewport, suffix) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });

  // 1. Landing, bright world.
  await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await wait(700);
  await shot(page, suffix === 'desktop' ? 'desktop' : 'mobile');

  // 2. The threshold — the named signature interaction.
  await clickText(page, /begin screening/i);
  await wait(3200); // all three statements revealed
  await shot(page, `${suffix}-threshold`);

  // 3. Prepare, dim world.
  await clickText(page, /go on/i);
  await wait(500);
  await rate(page, [4, 3, 1, 2]);
  await wait(300);
  await shot(page, `${suffix}-prepare`);

  // 4. Screen, mid-task, stimulus running.
  await clickText(page, /start the seven tasks/i);
  await wait(500);
  await clickText(page, /start this task/i);
  await wait(900);
  await shot(page, `${suffix}-screen`);

  // 4b. The rating beat is a separate phase by design; capture it too.
  await clickText(page, /end this task early/i);
  await wait(400);
  await rate(page, [5, 4, 1, 3]);
  await wait(300);
  await shot(page, `${suffix}-screen-rating`);

  // 5. Findings, after a complete demo battery.
  await clickText(page, /next task/i);
  await wait(400);
  for (let i = 1; i < 7; i++) {
    await clickText(page, /start this task/i);
    await wait(350);
    if (!(await clickText(page, /it doubled/i))) {
      await clickText(page, /end this task early/i);
    }
    await wait(350);
    await rate(page, i === 3 ? [7, 6, 2, 3] : [4, 3, 1, 2]);
    await wait(250);
    await clickText(page, /next task|see findings/i);
    await wait(400);
  }
  await wait(600);
  await shot(page, `${suffix}-findings`);

  await browser.close();
}

await mkdir(OUT, { recursive: true });
await run(DESKTOP, 'desktop');
await run(MOBILE, 'mobile');
console.log('done');
