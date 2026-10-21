// Runs against a normal production build served by `vite preview --port 5175`.
// Faults and API responses are synthetic; no account or database access.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const origin = 'http://127.0.0.1:5175';
const reports = [];
const output = '.playwright-mcp/startup-audit';
await fs.mkdir(output, { recursive: true });
async function test(name, run, options = {}) {
  const context = await browser.newContext(options);
  await context.route('**/api/v1/**', route => route.fulfill({ status: 503, json: { detail: 'Fixture offline' } }));
  const page = await context.newPage();
  try { await run(page, context); reports.push(name); } finally { await context.close(); }
}
const landing = page => page.getByRole('heading', { level: 1, name: /Chinh phục TOEIC/ }).waitFor();
try {
  await test('Normal landing and direct login load without browser errors while API is offline', async page => {
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin); await landing(page);
    await page.goto(`${origin}/login`); await page.getByRole('heading', { name: 'Chào mừng bạn quay trở lại!' }).waitFor();
    assert.deepEqual(errors, []);
  });
  for (const [name, pattern] of [['entry', '**/assets/index-*.js'], ['app', '**/assets/App-*.js'], ['route', '**/assets/LandingPage-*.js']]) {
    await test(`Missing ${name} module displays recovery and manual reload restores the page`, async page => {
      let requests = 0;
      await page.route(pattern, route => { requests++; return route.abort(); });
      await page.goto(origin);
      await page.getByRole('heading', { name: name === 'entry' ? 'Chưa thể mở trang' : 'Chưa thể mở nội dung', exact: true }).waitFor();
      assert(await page.getByRole('button', { name: 'Tải lại trang', exact: true }).isVisible());
      await page.screenshot({ path: `${output}/missing-${name}.png` });
      assert.equal(requests, 1, 'Unexpected automatic retry/reload loop');
      await page.unroute(pattern);
      await page.getByRole('button', { name: 'Tải lại trang', exact: true }).click();
      await landing(page);
    });
  }
  await test('Unexpected render failure is contained by the outer error boundary', async page => {
    await page.route('**/assets/LandingPage-*.js', route => route.fulfill({ contentType: 'application/javascript', body: 'export function LandingPage(){throw new Error("fixture render failure")}' }));
    await page.goto(origin);
    await page.getByRole('heading', { name: 'Chưa thể mở nội dung', exact: true }).waitFor();
    assert(await page.getByRole('link', { name: 'Về trang chủ', exact: true }).isVisible());
  });
  await test('Blocked localStorage and sessionStorage do not leave authentication pending', async (page, context) => {
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await context.addInitScript(() => {
      for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    });
    await page.goto(`${origin}/dashboard`);
    await page.getByRole('heading', { name: 'Chào mừng bạn quay trở lại!' }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/login');
    assert.deepEqual(errors, []);
  });
  for (const value of ['null', 'broken json', '{"fontSizeScale":0.001}', '{"fontSizeScale":10000000}', '{"fontSizeScale":-1}']) {
    await test(`Invalid display cache falls back to readable defaults: ${value}`, async (page, context) => {
      await context.addInitScript(value => localStorage.setItem('display_settings', value), value);
      await page.goto(origin); await landing(page);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize), '16px');
    });
  }
  for (const [preset, expected] of [[90, '12.8px'], [100, '16px'], [110, '18.4px'], [125, '20.8px']]) {
    await test(`Supported display preset ${preset} remains intact`, async (page, context) => {
      await context.addInitScript(preset => localStorage.setItem('display_settings', JSON.stringify({ fontSizeScale: preset })), preset);
      await page.goto(origin); await landing(page);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize), expected);
    });
  }
  await test('JavaScript disabled still displays an explanation and initial HTML', async page => {
    await page.goto(origin);
    assert(await page.locator('noscript').isVisible());
    assert((await page.locator('#root').innerText()).includes('Bạn cần bật JavaScript'));
  }, { javaScriptEnabled: false });
  await fs.writeFile(`${output}/results.json`, JSON.stringify({ passed: reports.length, reports }, null, 2));
  console.log(JSON.stringify({ passed: reports.length, reports }, null, 2));
} finally { await browser.close(); }
