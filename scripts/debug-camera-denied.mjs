/* Drive each camera failure mode and read back what the person is told. */
import { chromium } from 'playwright';
const BASE = 'http://localhost:5199';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(label, initScript, args = []) {
  const browser = await chromium.launch({ args });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (initScript) await ctx.addInitScript(initScript);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  for (const re of [/begin screening/i, /go on/i]) {
    for (const b of await page.locator('button').all()) {
      if (re.test((await b.textContent())?.trim() ?? '')) { await b.click(); break; }
    }
    await wait(400);
  }
  await page.locator('button', { hasText: /turn the camera on/i }).first().click();
  await wait(4000);
  const says = (await page.locator('[role="status"]').first().textContent())?.trim();
  const fix = await page.evaluate(() => document.querySelector('.border-l-2 p')?.textContent?.trim() ?? null);
  const detail = await page.evaluate(() => document.querySelectorAll('.border-l-2 p')[1]?.textContent?.trim() ?? null);
  const retry = await page.locator('button', { hasText: /try again/i }).count();
  console.log(`\n— ${label}\n  says:   ${says}\n  fix:    ${fix?.slice(0, 96)}\n  detail: ${detail}\n  retry button: ${retry}`);
  await browser.close();
}

const deny = (name, message) => `
  navigator.mediaDevices.getUserMedia = async () => {
    const e = new Error(${JSON.stringify(message)}); e.name = ${JSON.stringify(name)}; throw e;
  };`;

await run('permission denied', deny('NotAllowedError', 'Permission denied'));
await run('no camera present', deny('NotFoundError', 'Requested device not found'));
await run('camera in use', deny('NotReadableError', 'Could not start video source'));
await run('model files missing', `
  const of = window.fetch;
  window.fetch = (u, o) => (String(u).includes('/mp/') ? Promise.reject(new TypeError('Failed to fetch')) : of(u, o));
  const oX = window.XMLHttpRequest;
  window.XMLHttpRequest = class extends oX { open(m, u, ...r) { if (String(u).includes('/mp/')) u = '/__missing__'; return super.open(m, u, ...r); } };
`);
