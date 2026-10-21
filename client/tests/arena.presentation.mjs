// UI/audio fixtures only; no requests reach or mutate the real application DB.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
    : "playwright"
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const output = ".playwright-mcp/arena-winter";
await fs.mkdir(output, { recursive: true });
const errors = [],
  reports = [];
const user = {
  id: "arena-ui-test",
  name: "Winter_K1",
  email: "winter@example.invalid",
  role: "student",
  approvalStatus: "approved",
  hasValidRankingName: true,
  avatar: "",
  xp: 1000,
  streakDays: 0,
  targetScore: 750,
  currentScore: 0,
};
let match = null;
const lobby = () => ({
  balance: 1000,
  modes: [
    { id: "speed", name: "Part 5 Speed Duel", rounds: 7, seconds: 15 },
    { id: "vocabulary", name: "Vocabulary Blitz", rounds: 10, seconds: 10 },
    { id: "listening", name: "Listening Fill-in", rounds: 5, seconds: 20 },
  ],
  ranks: [
    { name: "Đồng", wager: 20 },
    { name: "Bạc", wager: 100 },
    { name: "Vàng", wager: 300 },
  ],
  stats: { wins: 0, losses: 0, draws: 0, earned_xp: 0 },
  active: match,
});
await context.addInitScript(() => {
  localStorage.setItem("toeic_master_auth_token", "arena-ui-fixture");
  localStorage.setItem("toeic_tour_completed_general", "true");
  window.__arenaAudio = { notes: [], analysers: [], contexts: [] };
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    constructor(...args) {
      super(...args);
      window.__arenaAudio.contexts.push(this);
    }
    createOscillator() {
      const oscillator = super.createOscillator(),
        start = oscillator.start.bind(oscillator);
      oscillator.start = (...args) => {
        window.__arenaAudio.notes.push(oscillator.frequency.value);
        return start(...args);
      };
      return oscillator;
    }
    createGain() {
      const gain = super.createGain(),
        connect = gain.connect.bind(gain),
        ctx = this;
      gain.connect = (destination, ...args) => {
        const result = connect(destination, ...args);
        if (destination === ctx.destination) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 2048;
          connect(analyser);
          window.__arenaAudio.analysers.push(analyser);
        }
        return result;
      };
      return gain;
    }
  };
});
await context.route("**/api/v1/**", async (route) => {
  const path = new URL(route.request().url()).pathname;
  let data = {
    success: true,
    data: [],
    unreadCount: 0,
    todaySeconds: 0,
    todayMinutes: 0,
  };
  if (path.endsWith("/auth/me")) data = { user };
  else if (path.endsWith("/announcements/unread-popup")) data = { data: null };
  else if (path.endsWith("/features/effective"))
    data = { data: { flags: { arena: true }, sources: { arena: "global" } } };
  else if (path.endsWith("/arena/lobby")) data = lobby();
  else if (/\/arena\/(leaderboard|history|transactions)$/.test(path)) data = [];
  else if (path.includes("/arena/matches/"))
    data = { ...match, serverTime: Date.now() / 1000 };
  await route.fulfill({ json: data });
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
try {
  await page.goto("http://127.0.0.1:5175/arena");
  await page.locator(".arena-modes").waitFor();
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [768, 1024],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    const metrics = await page.evaluate(() => {
      const main = document.querySelector("main"),
        arena = document.querySelector(".arena-page");
      const a = arena.getBoundingClientRect(),
        m = main.getBoundingClientRect(),
        s = getComputedStyle(main);
      return {
        gap: Math.abs(a.left - m.left) + Math.abs(a.right - m.right),
        padding: s.padding,
        border: getComputedStyle(arena).borderRadius,
        overflow: arena.scrollWidth > arena.clientWidth + 1,
      };
    });
    assert(
      metrics.gap < 2 &&
        metrics.padding === "0px" &&
        metrics.border === "0px" &&
        !metrics.overflow,
      JSON.stringify(metrics),
    );
    await page.screenshot({ path: `${output}/winter-${width}.png` });
    reports.push(
      `${width}x${height}: background edge-to-edge, no outer padding or overflow`,
    );
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const pixels = () =>
    page.locator("canvas.arena-snowfall").evaluate((el) => el.toDataURL());
  const first = await pixels();
  await page.waitForTimeout(180);
  assert.notEqual(await pixels(), first);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(100);
  const reduced = await pixels();
  await page.waitForTimeout(180);
  assert.equal(await pixels(), reduced);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  reports.push("snow animates normally and becomes still with reduced motion");
  await page.locator(".arena-modes button").nth(1).click();
  await page.waitForFunction(() =>
    window.__arenaAudio.analysers.some((a) => {
      const values = new Float32Array(a.fftSize);
      a.getFloatTimeDomainData(values);
      return values.some((v) => Math.abs(v) > 0.001);
    }),
  );
  reports.push(
    "first gesture unlocks AudioContext and generates a measurable nonzero audio signal",
  );
  await page.getByRole("button", { name: "Tắt âm thanh", exact: true }).click();
  await page.waitForTimeout(150);
  const muted = await page.evaluate(() => window.__arenaAudio.notes.length);
  await page.waitForTimeout(750);
  assert.equal(
    await page.evaluate(() => window.__arenaAudio.notes.length),
    muted,
  );
  await page.reload();
  await page.locator(".arena-modes").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Bật âm thanh", exact: true })
      .getAttribute("aria-pressed"),
    "false",
  );
  reports.push("mute stops note scheduling and persists after reload");
  await page.getByRole("button", { name: "Bật âm thanh", exact: true }).click();
  const players = [
    {
      id: user.id,
      name: user.name,
      ready: true,
      online: true,
      score: 0,
      answered: false,
      xpDelta: 0,
    },
    {
      id: "other",
      name: "Opponent_K1",
      ready: true,
      online: true,
      score: 0,
      answered: false,
      xpDelta: 0,
    },
  ];
  match = {
    id: "winter-match",
    code: "WINTER",
    hostId: user.id,
    mode: "speed",
    wager: 20,
    status: "playing",
    round: 1,
    rounds: 7,
    expiresAt: Date.now() / 1000 + 120,
    endsAt: Date.now() / 1000 + 18,
    serverTime: Date.now() / 1000,
    winnerId: null,
    players,
    question: { prompt: "Select an answer.", options: ["A", "B", "C", "D"] },
    feedback: null,
    submitted: false,
  };
  await page.reload();
  await page.locator(".arena-question").waitFor();
  await page.locator(".arena-question").click();
  await page.waitForTimeout(4200);
  const countCorrect = () =>
    page.evaluate(
      () =>
        window.__arenaAudio.notes.filter((f) => Math.abs(f - 1047) < 1).length,
    );
  const before = await countCorrect();
  match = {
    ...match,
    feedback: { correct: true, answer: "A" },
    submitted: true,
  };
  await page.waitForFunction(
    (n) =>
      window.__arenaAudio.notes.filter((f) => Math.abs(f - 1047) < 1).length >
      n,
    before,
  );
  const heard = await countCorrect();
  await page.waitForTimeout(1400);
  assert.equal(await countCorrect(), heard);
  match = { ...match, status: "finished", winnerId: user.id };
  await page.locator(".arena-result").waitFor();
  assert(
    await page.evaluate(() =>
      window.__arenaAudio.notes.some((f) => Math.abs(f - 1319) < 1),
    ),
  );
  reports.push(
    "countdown/round/answer/result transitions generate distinct cues; repeated polling does not replay answer feedback",
  );
  await page.evaluate(() => {
    history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.waitForFunction(() =>
    window.__arenaAudio.contexts.every((ctx) => ctx.state === "closed"),
  );
  reports.push("leaving Arena closes its audio context");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    `${output}/results.json`,
    JSON.stringify({ reports, errors }, null, 2),
  );
  console.log(JSON.stringify({ reports, errors }, null, 2));
} finally {
  await browser.close();
}
