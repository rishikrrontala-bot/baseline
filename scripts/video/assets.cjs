'use strict';
/* Render the logo set and a 3:2 Devpost gallery from the real app. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '..', '..', 'public', 'logo');
const GAL = path.join(__dirname, '..', '..', 'docs', 'gallery');
const BASE = process.env.DEMO_BASE || 'http://localhost:5199';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = 86400000, now = Date.now();
const SEED = [
  { d: 34, kind: 'baseline', p: 4, n: 3.0, v: 0 }, { d: 19, kind: 'screening', p: 46, n: 9.1, v: 5 },
  { d: 14, kind: 'screening', p: 38, n: 8.2, v: 4 }, { d: 9, kind: 'screening', p: 27, n: 6.4, v: 3 },
  { d: 4, kind: 'screening', p: 18, n: 5.2, v: 2 },
].map((r, i) => ({ id: `g${i}`, at: now - r.d * DAY, kind: r.kind, pcssTotal: r.p,
  pcssBand: r.p > 40 ? 'severe' : r.p > 20 ? 'moderate' : r.p > 8 ? 'mild' : 'minimal', pcssAnswered: 6,
  pretest: { headache: 2, dizziness: 1, nausea: 0, fogginess: 1 },
  provokedTasks: [], provokedCount: r.v, npcCm: r.n, rtsStage: 2, rtlStage: 3 }));

(async () => {
  fs.mkdirSync(GAL, { recursive: true });
  const browser = await chromium.launch();

  // ---- Logo PNGs -------------------------------------------------------
  for (const [file, size, bg] of [
    ['mark', 512, null], ['mark-dark', 512, null],
    ['lockup', 1600, null], ['lockup-dark', 1600, null],
  ]) {
    const svg = fs.readFileSync(path.join(OUT, `${file}.svg`), 'utf8');
    const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const [w, h] = [parseFloat(m[1]), parseFloat(m[2])];
    const page = await browser.newPage({
      viewport: { width: Math.round(size), height: Math.round((size * h) / w) },
      deviceScaleFactor: 2,
    });
    await page.setContent(`<!doctype html><meta charset="utf-8">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700&display=block">
      <style>html,body{margin:0;background:${bg ?? 'transparent'}}svg{display:block;width:100vw;height:100vh}</style>
      ${svg}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await wait(400);
    await page.screenshot({ path: path.join(OUT, `${file}.png`), omitBackground: true });
    await page.close();
    console.log('logo:', file);
  }

  // ---- Open Graph card -------------------------------------------------
  {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
    await page.setContent(`<!doctype html><meta charset="utf-8">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700&family=JetBrains+Mono:wght@400&display=block">
      <style>
        html,body{margin:0;height:100%}
        body{background:#12100F;color:#C9BFB6;display:flex;flex-direction:column;
             justify-content:space-between;padding:70px 78px;box-sizing:border-box;
             font-family:'JetBrains Mono',monospace}
        h1{font-family:'Bodoni Moda',Georgia,serif;font-weight:400;font-size:92px;
           line-height:.96;letter-spacing:-.02em;margin:0 0 22px;color:#EFE7E2}
        p{font-size:21px;line-height:1.5;margin:0;max-width:30ch;color:#8A807A}
        .k{font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#8A807A}
        svg{width:104px;height:104px}
      </style>
      <div class="k">Vestibular &amp; ocular-motor screening</div>
      <div>
        <h1>A concussion hides.<br>Your eyes don't.</h1>
        <p>A screening that runs entirely on your device, and refuses to guess when it cannot measure.</p>
      </div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between">
        ${fs.readFileSync(path.join(OUT, 'mark-dark.svg'), 'utf8')}
        <div class="k">rishikrrontala-bot.github.io/baseline</div>
      </div>`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await wait(500);
    await page.screenshot({ path: path.join(OUT, 'og-image.png') });
    await page.close();
    console.log('logo: og-image');
  }

  // ---- 3:2 gallery -----------------------------------------------------
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((s) => localStorage.setItem('baseline.history.v1',
    JSON.stringify({ version: 1, records: s })), SEED);
  const page = await ctx.newPage();
  const shot = async (n) => { await page.screenshot({ path: path.join(GAL, `${n}.png`) }); console.log('gallery:', n); };
  const click = async (re) => { for (const b of await page.locator('button').all())
    if (re.test((await b.textContent())?.trim() ?? '')) { await b.click(); return true; } return false; };
  const rate = async (v) => { for (const g of await page.locator('[role="radiogroup"]').all())
    await (await g.locator('input').all())[v]?.check({ force: true }); };
  const toText = async (t) => page.evaluate((needle) => {
    const el = [...document.querySelectorAll('h1,h2,h3,p,button,figcaption')]
      .find((e) => (e.textContent || '').toLowerCase().includes(needle.toLowerCase()));
    if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + scrollY - 120) });
  }, t);

  await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle' });
  await wait(900); await shot('01-landing');
  await click(/begin screening/i); await wait(900); await shot('02-threshold');
  await click(/go on/i); await wait(800); await rate(2); await wait(300); await shot('03-prepare');
  await click(/start the seven tasks/i); await wait(700);
  await click(/start this task/i); await wait(1400); await shot('04-stimulus');
  await click(/end this task early/i); await wait(600); await rate(3); await wait(300); await shot('05-rating');
  await click(/next task/i); await wait(500);
  for (let i = 1; i < 7; i++) {
    await click(/start this task/i); await wait(400);
    if (!(await click(/it doubled/i))) await click(/end this task early/i);
    await wait(400); await rate(i === 3 ? 5 : 2); await wait(150);
    await click(/next task|see findings/i); await wait(400);
  }
  await wait(900); await shot('06-findings');
  await toText('what to try next'); await wait(600); await shot('07-staging');
  await toText('keep this screening'); await wait(500);
  await click(/save as a screening/i); await wait(1000);
  await toText('against your baseline'); await wait(600); await shot('08-baseline-compare');
  await toText('your screenings over time'); await wait(700); await shot('09-trajectory');
  await page.emulateMedia({ media: 'print' }); await wait(400);
  await page.evaluate(() => window.scrollTo({ top: 0 })); await wait(300); await shot('10-print');
  await browser.close();
  console.log('done');
})();
