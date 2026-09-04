'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.DEMO_BASE || 'https://rishikrrontala-bot.github.io/baseline';
const OUT = path.join(__dirname, 'out');
const REHEARSE = process.argv.includes('--rehearse');
const DAY = 86_400_000;

// A three-week recovery, so the trajectory panel has something real to show.
const now = Date.now();
const SEED = [
  { d: 34, kind: 'baseline',  p: 4,  n: 3.0, v: 0 },
  { d: 19, kind: 'screening', p: 46, n: 9.1, v: 5 },
  { d: 14, kind: 'screening', p: 38, n: 8.2, v: 4 },
  { d: 9,  kind: 'screening', p: 27, n: 6.4, v: 3 },
  { d: 4,  kind: 'screening', p: 18, n: 5.2, v: 2 },
].map((r, i) => ({
  id: `demo_${i}`, at: now - r.d * DAY, kind: r.kind, pcssTotal: r.p,
  pcssBand: r.p > 40 ? 'severe' : r.p > 20 ? 'moderate' : r.p > 8 ? 'mild' : 'minimal',
  pcssAnswered: 6, pretest: { headache: 2, dizziness: 1, nausea: 0, fogginess: 1 },
  provokedTasks: [], provokedCount: r.v, npcCm: r.n, rtsStage: 2, rtlStage: 3,
}));

async function injectOverlays(page) {
  await page.evaluate(() => {
    if (!document.getElementById('demo-cursor')) {
      const c = document.createElement('div');
      c.id = 'demo-cursor';
      c.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
      c.style.cssText = 'position:fixed;z-index:999999;pointer-events:none;width:26px;height:26px;transition:left .09s,top .09s;filter:drop-shadow(1px 2px 3px rgba(0,0,0,.45));left:0;top:0';
      document.body.appendChild(c);
      document.addEventListener('mousemove', (e) => {
        c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px';
      });
    }
    if (!document.getElementById('demo-cap')) {
      const b = document.createElement('div');
      b.id = 'demo-cap';
      b.style.cssText = [
        'position:fixed;left:0;right:0;bottom:0;z-index:999998;pointer-events:none',
        'padding:20px 40px 24px;text-align:center',
        'background:linear-gradient(to top,rgba(0,0,0,.88),rgba(0,0,0,.72) 62%,rgba(0,0,0,0))',
        'color:#fff;font-family:-apple-system,"Segoe UI",Helvetica,sans-serif',
        'font-size:21px;line-height:1.4;font-weight:450;letter-spacing:.1px',
        'opacity:0;transition:opacity .22s',
      ].join(';');
      document.body.appendChild(b);
    }
  });
}

// Roughly how long a caption needs to be readable, floored so short lines
// do not flash past.
const readMs = (t) => Math.max(1700, Math.min(7000, 480 + t.length * 52));

async function say(page, text, extra = 0) {
  await page.evaluate((t) => {
    const b = document.getElementById('demo-cap');
    if (!b) return;
    b.textContent = t;
    b.style.opacity = t ? '1' : '0';
  }, text);
  if (text) await page.waitForTimeout(readMs(text) + extra);
}

async function moveAndClick(page, re, label, post = 700) {
  const all = await page.locator('button').all();
  for (const b of all) {
    const txt = (await b.textContent())?.trim() ?? '';
    if (!re.test(txt)) continue;
    if (!(await b.isVisible().catch(() => false))) continue;
    await b.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(220);
    const box = await b.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 14 });
      await page.waitForTimeout(320);
    }
    await b.click();
    await page.waitForTimeout(post);
    return true;
  }
  console.error(`MISS: "${label}" (/${re.source}/)`);
  return false;
}

async function rate(page, vals) {
  const groups = await page.locator('[role="radiogroup"]').all();
  for (let i = 0; i < groups.length; i++) {
    const inputs = await groups[i].locator('input').all();
    const target = inputs[vals[i] ?? 2];
    if (!target) continue;
    const seg = groups[i].locator('label').nth(vals[i] ?? 2);
    const box = await seg.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
      await page.waitForTimeout(150);
    }
    await target.check({ force: true });
    await page.waitForTimeout(260);
  }
}

async function scrollTo(page, y, ms = 1400) {
  await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'smooth' }), y);
  await page.waitForTimeout(ms);
}

/** Scroll the thing we are about to talk about into view, by its own text. */
async function scrollToText(page, text, label, offset = 140, ms = 1500) {
  const ok = await page.evaluate(({ text, offset }) => {
    const needle = text.toLowerCase();
    const els = [...document.querySelectorAll('h1,h2,h3,p,button,caption,dt,figcaption')];
    const hit = els.find((e) => (e.textContent || '').toLowerCase().includes(needle));
    if (!hit) return false;
    const y = hit.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    return true;
  }, { text, offset });
  if (!ok) console.error(`SCROLL MISS: "${label}" (looking for "${text}")`);
  await page.waitForTimeout(ms);
  return ok;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctxOpts = {
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    ...(REHEARSE ? {} : { recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } }),
  };
  const context = await browser.newContext(ctxOpts);
  await context.addInitScript((s) => {
    localStorage.setItem('baseline.history.v1', JSON.stringify({ version: 1, records: s }));
  }, SEED);
  const page = await context.newPage();
  let misses = 0;
  const step = async (ok) => { if (!ok) misses++; };

  try {
    // ---- Landing --------------------------------------------------------
    await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle' });
    await injectOverlays(page);
    await page.waitForTimeout(1200);
    await say(page, 'Concussion is diagnosed almost entirely on what the injured person tells you.');
    await say(page, 'And the people most likely to have one are the most motivated to under-report it.');
    await page.mouse.move(880, 380, { steps: 20 });
    await say(page, 'Eye movement is harder to talk yourself out of.');
    await scrollTo(page, 260);
    await say(page, 'Baseline runs a VOMS-style oculomotor screening entirely in the browser.');
    await say(page, 'No account, no upload, no server. The model runs on your own device.');
    await scrollTo(page, 0);
    await say(page, '');
    await step(await moveAndClick(page, /begin screening/i, 'Begin screening', 1500));

    // ---- Threshold ------------------------------------------------------
    await injectOverlays(page);
    await say(page, 'Light sensitivity and motion sensitivity are themselves concussion symptoms.');
    await say(page, 'So the app says what it is about to do, and then dims itself.');
    await say(page, 'Grain off. Motion stopped. Luminance capped. And it can be skipped.');
    await say(page, '');
    await step(await moveAndClick(page, /go on/i, 'Go on', 1400));

    // ---- Prepare --------------------------------------------------------
    await injectOverlays(page);
    await say(page, 'First: how you feel right now, before any task has run.');
    await rate(page, [2, 1, 0, 1]);
    await say(page, 'Provocation is a change from your own starting point, not an absolute score.');
    await scrollToText(page, 'demonstration mode', 'demo notice');
    await say(page, 'This walkthrough runs in demonstration mode, with no camera attached.');
    await say(page, '');
    await scrollTo(page, 600);
    await step(await moveAndClick(page, /start the seven tasks/i, 'Start tasks', 1400));

    // ---- Screening ------------------------------------------------------
    const beats = [
      ['Seven tasks. Smooth pursuit first — follow the dot with your eyes.',
       'The stimulus is the only thing that moves in these rooms.'],
      [],
      ['After every task you rate the same four symptoms again.'],
      ['Near point of convergence is measured in real centimetres.',
       'The human iris is about 11.7 mm wide in every adult — so it works as a ruler.'],
      ['Then the vestibulo-ocular reflex: the head turns, the eyes hold still.'],
      [], [],
    ];
    for (let i = 0; i < 7; i++) {
      await injectOverlays(page);
      for (const line of beats[i] ?? []) await say(page, line);
      await step(await moveAndClick(page, /start this task/i, `task ${i + 1} start`, 500));
      await page.waitForTimeout(i < 2 ? 3200 : 1500);
      if (!(await moveAndClick(page, /it doubled/i, 'converged', 500))) {
        await moveAndClick(page, /end this task early/i, 'end early', 500);
      }
      await rate(page, i === 3 ? [5, 4, 1, 3] : [2, 1, 0, 1]);
      await step(await moveAndClick(page, /next task|see findings/i, `task ${i + 1} next`, 700));
    }

    // ---- Findings -------------------------------------------------------
    await injectOverlays(page);
    await page.waitForTimeout(900);
    await say(page, 'The heading states exactly what was found — no more than that.');
    await scrollToText(page, 'provocation is a rise', 'task table');
    await say(page, 'Every task, with what it did and did not provoke.');
    await say(page, 'With a camera, five of these tasks also produce an objective gain.');
    await say(page, 'And where it cannot measure, it says so — never letting that pass as normal.');
    await scrollToText(page, 'what to try next', 'staging');
    await say(page, 'A return-to-sport and a return-to-learn stage, from the Amsterdam 2023 protocol.');
    await say(page, 'Return-to-learn is the half almost nothing else builds for.');
    await scrollToText(page, 'emergency department', 'red flags');
    await say(page, 'Red flags that mean stop and go to an emergency department now.');
    await say(page, '');

    // ---- History and trajectory ----------------------------------------
    await scrollToText(page, 'keep this screening', 'save prompt');
    await say(page, 'Saving is a choice, never automatic.');
    await step(await moveAndClick(page, /save as a screening/i, 'save', 1400));
    await injectOverlays(page);
    await scrollToText(page, 'against your baseline', 'comparison');
    await say(page, 'Now it is read against your own baseline, not a population average.');
    await say(page, 'Normal convergence varies: 4.5 cm is unremarkable for one person, a finding for another.');
    await scrollToText(page, 'your screenings over time', 'trajectory');
    await say(page, 'And the record becomes a recovery trajectory.');
    await say(page, 'Symptoms and convergence on separate axes, because they are different scales.');
    await scrollToText(page, 'near point of convergence (cm)', 'npc panel');
    await say(page, 'Rings mark the readings beyond the cut point, so it survives greyscale and print.');
    await scrollToText(page, 'export my record', 'export');
    await say(page, 'It lives in this browser only. Export it or erase it, right here.');
    await say(page, '');
    await say(page, '116 tests. Nothing ever leaves the device.', 600);
    await say(page, 'Baseline — rishikrrontala-bot.github.io/baseline', 1400);
    await say(page, '');
    await page.waitForTimeout(1200);
  } catch (e) {
    console.error('DEMO ERROR:', e.message);
    misses++;
  } finally {
    await context.close();
    const v = page.video();
    if (v && !REHEARSE) {
      const src = await v.path();
      const dest = path.join(OUT, 'baseline-demo.webm');
      fs.copyFileSync(src, dest);
      const secs = 'unknown';
      console.log('video:', dest, fs.statSync(dest).size, 'bytes', secs);
    }
    console.log(misses === 0 ? 'ALL STEPS OK' : `MISSES: ${misses}`);
    await browser.close();
    process.exit(misses === 0 ? 0 : 1);
  }
})();
