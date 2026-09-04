/* Seed a plausible recovery record, then walk to Findings and capture it. */
import { chromium } from 'playwright';
const BASE = 'http://localhost:5199';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = 86_400_000;
const now = Date.now();

// A concussion recovering over three weeks: symptoms fall, convergence
// recovers from beyond the cut point back inside it.
const seed = [
  { d: 40, kind: 'baseline',  pcss: 4,  npc: 3.0, prov: 0 },
  { d: 21, kind: 'screening', pcss: 46, npc: 9.1, prov: 5 },
  { d: 16, kind: 'screening', pcss: 38, npc: 8.2, prov: 4 },
  { d: 11, kind: 'screening', pcss: 27, npc: 6.4, prov: 3 },
  { d: 6,  kind: 'screening', pcss: 18, npc: 5.2, prov: 2 },
  { d: 2,  kind: 'screening', pcss: 11, npc: 4.1, prov: 1 },
].map((r, i) => ({
  id: `seed_${i}`, at: now - r.d * DAY, kind: r.kind,
  pcssTotal: r.pcss, pcssBand: r.pcss > 40 ? 'severe' : r.pcss > 20 ? 'moderate' : r.pcss > 8 ? 'mild' : 'minimal',
  pcssAnswered: 6, pretest: { headache: 2, dizziness: 1, nausea: 0, fogginess: 1 },
  provokedTasks: [], provokedCount: r.prov, npcCm: r.npc, rtsStage: 2, rtlStage: 3,
}));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(({ seed }) => {
  localStorage.setItem('baseline.history.v1', JSON.stringify({ version: 1, records: seed }));
}, { seed });

async function click(re) {
  for (const b of await page.locator('button').all()) {
    if (re.test((await b.textContent())?.trim() ?? '')) { await b.click(); return true; }
  }
  return false;
}
async function rate(vals) {
  const gs = await page.locator('[role="radiogroup"]').all();
  for (let i = 0; i < gs.length; i++) {
    await (await gs[i].locator('input').all())[vals[i] ?? 2]?.check({ force: true });
  }
}

await page.goto(`${BASE}/?demo=1`, { waitUntil: 'networkidle' });
await click(/begin screening/i); await wait(400);
await click(/go on/i); await wait(400);
await rate([2, 1, 0, 1]); await wait(150);
await click(/start the seven tasks/i); await wait(400);
for (let i = 0; i < 7; i++) {
  await click(/start this task/i); await wait(280);
  if (!(await click(/it doubled/i))) await click(/end this task early/i);
  await wait(280);
  await rate(i === 3 ? [4, 3, 1, 2] : [2, 1, 0, 1]); await wait(150);
  await click(/next task|see findings/i); await wait(320);
}
await wait(700);
await click(/save as a screening/i); await wait(700);
await page.screenshot({ path: '.impeccable/review/desktop-history.png', fullPage: true });
console.log('captured desktop-history');
await browser.close();
