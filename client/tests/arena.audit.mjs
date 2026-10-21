// Browser-only audit fixtures. Does not send any request to the real API/DB.
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
  viewport: { width: 1366, height: 768 },
});
const errors = [],
  reports = [];
let active = null;
const user = {
  id: "arena-audit",
  name: "Audit_K1",
  role: "student",
  email: "audit@example.invalid",
  approvalStatus: "approved",
  hasValidRankingName: true,
  xp: 1000,
  avatar: "",
  targetScore: 750,
  currentScore: 0,
  streakDays: 0,
};
const modes = [
  { id: "speed", name: "Part 5 Speed Duel", rounds: 7, seconds: 15 },
  { id: "vocabulary", name: "Vocabulary Blitz", rounds: 10, seconds: 10 },
  { id: "listening", name: "Listening Fill-in", rounds: 5, seconds: 20 },
];
const leaders = Array.from({ length: 50 }, (_, i) => ({
  user_id: `player-${i}`,
  name:
    i === 0
      ? "TênTiếngViệtRấtDàiKhôngCóKhoảngTrắng".repeat(4)
      : `Học viên ${i}`,
  avatar: null,
  wins: 15,
  losses: 5,
  draws: 0,
  earned_xp: 1000 - i,
}));
await context.addInitScript(() => {
  localStorage.setItem("toeic_master_auth_token", "audit-fixture");
  localStorage.setItem("toeic_tour_completed_general", "true");
  localStorage.setItem("toeic_arena_sound_enabled", "false");
});
await context.route("**/api/v1/**", async (route) => {
  const path = new URL(route.request().url()).pathname;
  let data = { success: true, data: [], todaySeconds: 0, unreadCount: 0 };
  if (path.endsWith("/auth/me")) data = { user };
  else if (path.endsWith("/features/effective"))
    data = { data: { flags: { arena: true } } };
  else if (path.endsWith("/announcements/unread-popup")) data = { data: null };
  else if (path.endsWith("/arena/lobby"))
    data = {
      balance: 1000,
      modes,
      ranks: [
        { name: "Đồng", wager: 20 },
        { name: "Bạc", wager: 100 },
        { name: "Vàng", wager: 300 },
      ],
      stats: { wins: 0, losses: 0, draws: 0, earned_xp: 0 },
      active,
    };
  else if (path.endsWith("/arena/leaderboard")) data = leaders;
  else if (path.endsWith("/arena/history"))
    data = Array.from({ length: 50 }, (_, i) => ({
      id: `m-${i}`,
      mode: "speed",
      wager: 20,
      status: "finished",
      winner_id: user.id,
      finished_at: Date.now() / 1000,
      score: 100,
      xp_delta: 14,
      opponent: "Đối thủ với tên dài ".repeat(5),
    }));
  else if (path.endsWith("/arena/transactions")) data = [];
  else if (path.endsWith("/arena/queue")) {
    active = {
      id: "search",
      code: "AUDIT2",
      mode: "speed",
      wager: 20,
      status: "searching",
      hostId: user.id,
      round: 1,
      rounds: 7,
      expiresAt: Date.now() / 1000 + 60,
      endsAt: null,
      serverTime: Date.now() / 1000,
      winnerId: null,
      question: null,
      feedback: null,
      submitted: false,
      players: [
        {
          id: user.id,
          name: user.name,
          avatar: null,
          ready: false,
          score: 0,
          xpDelta: 0,
          online: true,
        },
      ],
    };
    data = active;
  } else if (path.includes("/arena/matches/"))
    data = { ...active, serverTime: Date.now() / 1000 };
  await route.fulfill({ json: data });
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const setDisplay = async (scale) =>
  page.evaluate(async (scale) => {
    const s = await import("/src/services/displaySettings.ts");
    s.saveDisplaySettings({
      fontSizeScale: scale,
      fontFamily: "Arial",
      fontWeight: 600,
    });
  }, scale);
const output = ".playwright-mcp/arena-audit";
await fs.mkdir(output, { recursive: true });
try {
  await page.goto("http://127.0.0.1:5173/arena");
  await page.locator(".arena-modes").waitFor();
  await setDisplay(100);
  const initial = await page
    .locator(".arena-rule")
    .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  await setDisplay(125);
  const enlarged = await page.locator(".arena-rule").evaluate((e) => ({
    size: parseFloat(getComputedStyle(e).fontSize),
    family: getComputedStyle(e).fontFamily,
    weight: getComputedStyle(e).fontWeight,
  }));
  assert(
    Math.abs(enlarged.size / initial - 1.3) < 0.02,
    `Scale setting ignored: ${initial} -> ${enlarged.size}`,
  );
  assert(
    enlarged.family.startsWith("Arial"),
    `Font setting ignored: ${enlarged.family}`,
  );
  assert.equal(enlarged.weight, "600");
  reports.push(
    "actual settings service updates font size, font family and body weight in Arena",
  );
  for (const [width, height] of [
    [1920, 1080],
    [1366, 768],
    [768, 1024],
    [390, 844],
    [320, 568],
  ])
    for (const scale of [90, 100, 110, 125]) {
      await page.setViewportSize({ width, height });
      await setDisplay(scale);
      const metrics = await page.evaluate(() => {
        const main = document.querySelector("main"),
          area = document.querySelector(".arena-page");
        return {
          horizontal: area.scrollWidth > area.clientWidth + 1,
          document: document.documentElement.scrollWidth > innerWidth + 1,
          mainHeight: main.clientHeight,
          viewport: innerHeight,
        };
      });
      assert(
        !metrics.horizontal && !metrics.document,
        `Overflow: ${width},${scale}: ${JSON.stringify(metrics)}`,
      );
      assert(
        metrics.mainHeight < metrics.viewport,
        `Outer shell expanded instead of scrolling: ${width},${scale}`,
      );
      await page
        .locator("main")
        .evaluate((el) => (el.scrollTop = el.scrollHeight));
      const last = page.getByRole("button", { name: "Xem toàn bộ BXH" });
      assert(await last.isVisible());
      const box = await last.boundingBox();
      assert(
        box.y + box.height <= height + 1,
        `Bottom action inaccessible at ${width},${scale}`,
      );
      if (scale === 125)
        await page.screenshot({ path: `${output}/scale125-${width}.png` });
      await page.locator("main").evaluate((el) => (el.scrollTop = 0));
    }
  reports.push(
    "20 viewport/scale combinations: page scrolls to last action without horizontal overflow",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await setDisplay(125);
  await page
    .getByRole("button", { name: "Lịch sử & BXH", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert(await dialog.evaluate((e) => e.scrollHeight > e.clientHeight));
  assert(
    await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    "Dialog horizontal overflow",
  );
  await dialog.evaluate((el) => (el.scrollTop = el.scrollHeight));
  assert(await dialog.evaluate((el) => el.scrollTop > 0));
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  assert(
    await dialog.evaluate((e) => e.contains(document.activeElement)),
    "Focus escaped modal",
  );
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  reports.push(
    "long history modal scrolls, contains focus and closes with Escape at mobile/125%",
  );
  await page.locator("main").evaluate((el) => (el.scrollTop = 0));
  await page
    .getByRole("button", { name: "Tìm trận nhanh", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Đang tìm đối thủ", exact: true })
    .waitFor();
  assert(
    await page
      .getByRole("button", { name: "Sẵn sàng", exact: true })
      .isDisabled(),
    "Ready button silently does nothing while searching",
  );
  reports.push("searching state does not expose a nonfunctional ready action");
  await page.getByRole("button", { name: "Sao chép mã", exact: true }).click();
  await page.getByText(/Đã sao chép|Mã phòng: AUDIT2/).waitFor();
  reports.push("copy room code has success/fallback feedback");
  active = {
    ...active,
    status: "playing",
    mode: "speed",
    round: 1,
    rounds: 7,
    endsAt: Date.now() / 1000 + 150,
    serverTime: Date.now() / 1000,
    question: {
      prompt: "Câu hỏi có dấu tiếng Việt rất dài. ".repeat(20),
      options: [
        "MộtĐápÁnKhôngCóKhoảngTrắng".repeat(15),
        "Đáp án B",
        "Đáp án C",
        "Đáp án D",
      ],
    },
    players: [
      ...active.players,
      {
        id: "other",
        name: "Tên rất dài ".repeat(12),
        ready: true,
        online: true,
        score: 0,
        answered: false,
        xpDelta: 0,
      },
    ],
    submitted: false,
    feedback: null,
  };
  await page.reload();
  await page.locator(".arena-question").waitFor();
  await setDisplay(125);
  for (const width of [1366, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      await page
        .locator(".arena-page")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      `Long gameplay text overflow at ${width}`,
    );
    await page
      .getByRole("button", { name: "Rời trận", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/game-scale125-${width}.png` });
  }
  await page.getByRole("button", { name: "Rời trận", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page
    .getByRole("button", { name: "Tiếp tục chơi", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  reports.push(
    "long Vietnamese questions/answers and opponent names fit gameplay at 125%; leave confirmation can be cancelled",
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    `${output}/results.json`,
    JSON.stringify({ reports, errors }, null, 2),
  );
  console.log(JSON.stringify({ reports, errors }, null, 2));
} finally {
  await browser.close();
}
