// Voice mode in a real browser. Run against a production build served by `vite preview --port 5175`.
// Auth, features and the voice WebSocket are all synthetic: no account, database or AI server needed.
// Chrome gets a fake microphone, so the real capture pipeline (AudioWorklet -> PCM frames) is exercised.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');

const origin = 'http://127.0.0.1:5175';
const output = '.playwright-mcp/voice-audit';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});

const FLAGS = Object.fromEntries(['arena', 'dashboard', 'mock_test', 'vocabulary', 'grammar', 'listening', 'history',
  'ranking', 'profile', 'settings', 'feedback', 'ai_voice', 'national_day_theme'].map(k => [k, k !== 'arena' && k !== 'national_day_theme']));

const tone = (seq, ms = 400, rate = 24000) => {
  const n = Math.floor(rate * ms / 1000);
  const buf = Buffer.alloc(4 + n * 2);
  buf.writeUInt32BE(seq, 0);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(9000 * Math.sin(2 * Math.PI * 330 * i / rate)), 4 + i * 2);
  return buf;
};

async function open({ available = true, viewport = { width: 1280, height: 800 } } = {}) {
  const context = await browser.newContext({ viewport, permissions: ['microphone'] });
  const errors = [];
  await context.addInitScript(() => {
    localStorage.setItem('toeic_master_auth_token', 'synthetic-voice-token');
    localStorage.setItem('toeic_tour_completed_general', 'true');
    localStorage.setItem('toeic_legacy_data_migrated_v3:voice-fixture', 'true');
  });
  await context.route('**/api/v1/**', route => route.fulfill({ status: 503, json: { detail: 'Fixture offline' } }));
  await context.route('**/api/v1/auth/me', route => route.fulfill({ json: { user: {
    id: 'voice-fixture', name: 'Voice_K1', email: 'voice@example.invalid', role: 'student', approvalStatus: 'approved',
    hasValidRankingName: true, xp: 1000, streakDays: 0, longestStreak: 0, currentScore: 0, targetScore: 750 } } }));
  await context.route('**/api/v1/features/effective', route => route.fulfill({ json: { success: true, data: { flags: FLAGS, sources: {} } } }));
  await context.route('**/api/v1/ai/status', route => route.fulfill({ json: { success: true, data: {
    enabled: true, available, voiceEnabled: true, active: available ? { key: 'primary', label: 'Mac', ok: true, model: 'qwen3:14b', profile: 'mac', rttMs: 12 } : null,
    servers: [] } } }));
  await context.route('**/api/v1/ai/conversations', route => route.fulfill({ json: { success: true, data: [
    { id: 'c1', mode: 'speaking', persona: 'friendly', server: 'Mac', durationSeconds: 130, turns: 4, createdAt: '2026-11-07 10:00:00' }] } }));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));

  const server = { start: null, text: [], mute: [], types: [], mic: 0, send: null };
  await page.routeWebSocket('**/ai/voice/ws', ws => {
    server.send = (event) => ws.send(typeof event === 'string' || Buffer.isBuffer(event) ? event : JSON.stringify(event));
    ws.onMessage(message => {
      if (Buffer.isBuffer(message)) { server.mic += 1; return; }
      const data = JSON.parse(message);
      server.types.push(data.type);
      if (data.type === 'start') {
        server.start = data;
        server.send({ type: 'server', key: 'primary', label: 'Mac' });
        server.send({ type: 'state', value: 'listening' });
      } else if (data.type === 'text') server.text.push(data.text);
      else if (data.type === 'mute') server.mute.push(data.value);
      else if (data.type === 'end') {
        server.send({ type: 'state', value: 'thinking' });
        server.send({ type: 'summary', duration_seconds: 95, turns: 2, transcript: [], tip: 'Bạn nên luyện thêm thì quá khứ đơn nhé.',
          mistakes: [{ original: 'Yesterday I go to the office', better: 'Yesterday I went to the office', note: 'Dùng thì quá khứ đơn với "yesterday".' }],
          new_words: [{ word: 'invoice', meaning_vi: 'hóa đơn' }], conversationId: 'c-new' });
      }
    });
  });
  return { context, page, errors, server };
}

const results = [];
async function test(name, run, options) {
  const env = await open(options);
  try { await run(env); results.push(name); console.log('ok -', name); }
  finally { await env.context.close(); }
}
const shot = (page, name) => page.screenshot({ path: `${output}/${name}.png` });

try {
  await test('idle screen invites the learner to start and shows the chosen mode', async ({ page, errors }) => {
    await page.goto(`${origin}/voice`);
    await page.getByRole('heading', { name: 'Trò chuyện với AI', level: 1 }).waitFor();
    const start = page.getByRole('button', { name: 'Bắt đầu trò chuyện' });
    await start.waitFor();
    assert.equal(await start.isEnabled(), true);
    assert.ok((await page.getByText('Trợ lý TOEIC').count()) >= 1);
    const box = await start.boundingBox();
    assert.ok(box.height >= 44, 'touch target must be at least 44px');
    await shot(page, 'idle-desktop');
    assert.deepEqual(errors, []);
  });

  await test('idle screen on a phone has no horizontal scroll and a 44px+ start button', async ({ page, errors }) => {
    await page.goto(`${origin}/voice`);
    await page.getByRole('button', { name: 'Bắt đầu trò chuyện' }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `page scrolls sideways by ${overflow}px`);
    await shot(page, 'idle-phone');
    assert.deepEqual(errors, []);
  }, { viewport: { width: 390, height: 844 } });

  await test('when the assistant is unreachable the start button is disabled and the reason is friendly', async ({ page }) => {
    await page.goto(`${origin}/voice`);
    await page.getByText(/đang nghỉ ngơi/).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Bắt đầu trò chuyện' }).isDisabled(), true);
    assert.equal(await page.getByText(/ollama|server|websocket|token/i).count(), 0, 'no technical wording on screen');
    await shot(page, 'unavailable');
  }, { available: false });

  await test('a full conversation: start, mic frames, replies, mute, typed text, failover, summary', async ({ page, server, errors }) => {
    await page.goto(`${origin}/voice`);
    await page.getByRole('button', { name: 'Bắt đầu trò chuyện' }).click();

    await page.getByText('Mình đang nghe bạn').waitFor();
    await page.getByText('Đang chạy trên Mac').waitFor();
    assert.equal(server.start.type, 'start');
    assert.equal(server.start.token, 'synthetic-voice-token', 'session token is sent in the first frame');
    assert.equal('captions' in server.start.settings, false, 'display-only setting stays in the browser');
    await shot(page, 'live-listening');

    await page.waitForFunction(() => true);
    for (let i = 0; i < 60 && server.mic < 5; i++) await page.waitForTimeout(100);
    assert.ok(server.mic >= 5, `fake microphone produced ${server.mic} PCM frames`);

    server.send({ type: 'state', value: 'user-speaking' });
    await page.getByText('Bạn cứ nói nhé').waitFor();
    server.send({ type: 'transcript', final: true, text: 'Xin chào, mình muốn luyện nói', lang: 'vi', source: 'voice' });
    server.send({ type: 'state', value: 'thinking' });
    await page.getByText('Đang suy nghĩ…').waitFor();
    server.send({ type: 'state', value: 'ai-speaking' });
    server.send({ type: 'assistant_delta', text: 'Chào bạn! Hello, how are you today?', seq: 0 });
    server.send({ type: 'audio_start', seq: 0, lang: 'vi' });
    server.send(tone(0));
    server.send({ type: 'audio_end', seq: 0 });
    await page.getByText('Chào bạn! Hello, how are you today?').first().waitFor();
    await page.getByText('Đang trả lời').waitFor();
    await shot(page, 'live-speaking');

    // Mute
    const mute = page.getByRole('button', { name: 'Tắt micro' });
    await mute.click();
    assert.equal(await page.getByRole('button', { name: 'Bật micro' }).getAttribute('aria-pressed'), 'true');
    await page.waitForFunction(() => true);
    for (let i = 0; i < 20 && server.mute.length === 0; i++) await page.waitForTimeout(50);
    assert.deepEqual(server.mute, [true]);
    server.send({ type: 'state', value: 'listening' });
    await page.getByText('Micro đang tắt').waitFor();
    await shot(page, 'live-muted');
    await page.getByRole('button', { name: 'Bật micro' }).click();

    // Typed question
    await page.getByLabel('Gõ câu hỏi cho trợ lý').fill('invoice nghĩa là gì?');
    await page.getByRole('button', { name: 'Gửi câu hỏi' }).click();
    for (let i = 0; i < 20 && server.text.length === 0; i++) await page.waitForTimeout(50);
    assert.deepEqual(server.text, ['invoice nghĩa là gì?']);
    assert.equal(await page.getByLabel('Gõ câu hỏi cho trợ lý').inputValue(), '', 'input clears after sending');

    // Failover shows a calm notice, then the new machine name
    server.send({ type: 'failover', from: 'Mac' });
    await page.getByText(/chế độ dự phòng/).waitFor();
    server.send({ type: 'server', key: 'fallback', label: 'Laptop' });
    await page.getByText('Đang chạy trên Laptop').waitFor();
    assert.equal(await page.getByText(/chế độ dự phòng/).count(), 0, 'notice clears once reconnected');

    // History drawer shows the transcript, closes on Escape
    await page.getByRole('button', { name: 'Xem lịch sử trò chuyện' }).click();
    const drawer = page.getByRole('dialog', { name: 'Lịch sử trò chuyện' });
    await drawer.waitFor();
    await drawer.getByText('Xin chào, mình muốn luyện nói').waitFor();
    await shot(page, 'history-drawer');
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'detached' });

    // Settings sheet is read-only for mode while talking
    await page.getByRole('button', { name: 'Mở cài đặt trò chuyện' }).click();
    const sheet = page.getByRole('dialog', { name: 'Cài đặt trò chuyện' });
    await sheet.getByText(/áp dụng từ cuộc trò chuyện sau/).waitFor();
    assert.equal(await sheet.getByRole('radio', { name: /Luyện nói tiếng Anh/ }).isDisabled(), true);
    await shot(page, 'settings-live');
    await page.keyboard.press('Escape');
    await sheet.waitFor({ state: 'detached' });

    // End -> summary
    await page.getByRole('button', { name: 'Kết thúc cuộc trò chuyện' }).click();
    await page.getByRole('heading', { name: /Cùng xem lại vài điểm nhỏ/ }).waitFor();
    await page.getByText('Yesterday I went to the office').waitFor();
    await page.getByText('hóa đơn').waitFor();
    assert.ok(server.types.includes('end'));
    await shot(page, 'summary');
    assert.deepEqual(errors, []);
  });

  await test('fatal server error stops the session with a plain-language message and a retry', async ({ page, server }) => {
    await page.goto(`${origin}/voice`);
    await page.getByRole('button', { name: 'Bắt đầu trò chuyện' }).click();
    await page.getByText('Mình đang nghe bạn').waitFor();
    server.send({ type: 'error', code: 'ai_unavailable', message: 'Ollama is not reachable' });
    await page.getByRole('alert').getByText(/Trợ lý AI hiện chưa sẵn sàng/).waitFor();
    assert.equal(await page.getByText(/ollama/i).count(), 0);
    await page.getByRole('button', { name: 'Thử lại' }).waitFor();
    await shot(page, 'error');
  });

  await test('settings: choosing role-play reveals scenarios and the choice survives a reload', async ({ page }) => {
    await page.goto(`${origin}/voice`);
    await page.getByRole('button', { name: 'Mở cài đặt trò chuyện' }).click();
    await page.getByRole('radio', { name: /Nhập vai tình huống/ }).click();
    await page.getByRole('radio', { name: 'Họp nhóm' }).click();
    await page.getByRole('radio', { name: 'Hài hước' }).click();
    await shot(page, 'settings-idle');
    await page.keyboard.press('Escape');
    await page.reload();
    await page.getByRole('button', { name: 'Nhập vai tình huống' }).waitFor();
  });
  console.log(`\n${results.length} voice browser tests passed`);
} finally {
  await browser.close();
}
