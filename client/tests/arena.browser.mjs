// Run against server/tests/arena_browser_server.py and a production preview built
// with VITE_API_BASE_URL=http://127.0.0.1:8009/api/v1. Never target production.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(
  modulePath ? pathToFileURL(modulePath).href : "playwright"
);
const base = "http://127.0.0.1:5175";
const api = "http://127.0.0.1:8009/api/v1";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const reports = [];
const out = ".playwright-mcp/arena-validation";
await fs.mkdir(out, { recursive: true });
const open = async (number) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  // Keep every browser API request inside the disposable local harness even
  // when validating a normal production build whose default API port is 8000.
  await context.route('**/api/v1/**', route => {
    const original = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(original.hostname)) return route.abort();
    const target = new URL(api);
    original.host = target.host; original.protocol = target.protocol;
    return route.continue({ url: original.href });
  });
  await context.addInitScript((n) => {
    localStorage.setItem("toeic_master_auth_token", `arena-browser-test-${n}`);
    localStorage.setItem("toeic_tour_completed_general", "true");
    localStorage.setItem("toeic_arena_sound_enabled", "false");
  }, number);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto(`${base}/arena`);
  await page.locator(".arena-modes").waitFor();
  return { page, context, token: `arena-browser-test-${number}` };
};
const request = async (player, path, options = {}) => {
  const res = await player.context.request.fetch(`${api}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${player.token}`, ...options.headers },
  });
  assert(res.ok(), `${path}: ${res.status()} ${await res.text()}`);
  return res.json();
};
try {
  const a = await open(3);
  const b = await open(4);
  for (const [width, height] of [
    [1920, 1080],
    [1920, 900],
    [1440, 900],
    [1366, 768],
    [768, 1024],
    [390, 844],
  ]) {
    await a.page.setViewportSize({ width, height });
    await a.page.screenshot({ path: `${out}/lobby-${width}x${height}.png` });
    const overflow = await a.page.evaluate(() => {
      const area = document.querySelector(".arena-page");
      return {
        page: document.documentElement.scrollWidth > innerWidth + 1,
        arena: area.scrollWidth > area.clientWidth + 1,
      };
    });
    assert(
      !overflow.page && !overflow.arena,
      `Overflow at ${width}: ${JSON.stringify(overflow)}`,
    );
    reports.push(`viewport ${width}x${height}: no horizontal overflow`);
  }
  await a.page.setViewportSize({ width: 1440, height: 900 });
  await a.page.getByRole("button", { name: "Tạo phòng", exact: true }).click();
  await a.page.getByRole("dialog").waitFor();
  await a.page.keyboard.press("Escape");
  await a.page.getByRole("dialog").waitFor({ state: "detached" });
  reports.push("create dialog opens and dismisses with Escape");
  const sound = a.page.getByRole("button", {
    name: "Bật âm thanh",
    exact: true,
  });
  await sound.click();
  assert.equal(
    await a.page
      .getByRole("button", { name: "Tắt âm thanh", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await a.page
    .getByRole("button", { name: "Tắt âm thanh", exact: true })
    .click();
  reports.push("sound toggle updates its accessible pressed state");

  for (const mode of ["speed", "vocabulary", "listening"]) {
    const modes = {
      speed: "Part 5 Speed Duel",
      vocabulary: "Vocabulary Blitz",
      listening: "Listening Fill-in",
    };
    await a.page
      .locator(".arena-modes button")
      .filter({ hasText: modes[mode] })
      .click();
    await b.page
      .locator(".arena-modes button")
      .filter({ hasText: modes[mode] })
      .click();
    if (mode === "vocabulary") {
      await Promise.all([
        a.page
          .getByRole("button", { name: "Tìm trận nhanh", exact: true })
          .click(),
        b.page
          .getByRole("button", { name: "Tìm trận nhanh", exact: true })
          .click(),
      ]);
      await a.page.waitForFunction(
        () =>
          document.querySelectorAll(".arena-waiting-players .arena-avatar")
            .length === 2,
      );
    } else {
      await a.page
        .getByRole("button", { name: "Tạo phòng", exact: true })
        .click();
      await a.page
        .getByRole("button", { name: "Xác nhận tạo phòng", exact: true })
        .click();
      await a.page.locator(".arena-room-code strong").waitFor();
      const code = await a.page.locator(".arena-room-code strong").innerText();
      await b.page.locator("#arena-code").fill(code);
      await b.page.getByRole("button", { name: "Vào", exact: true }).click();
    }
    await a.page.getByRole("button", { name: "Sẵn sàng", exact: true }).click();
    await b.page.getByRole("button", { name: "Sẵn sàng", exact: true }).click();
    const l = await request(a, "/arena/lobby");
    const id = l.active.id;
    const host =
      l.active.hostId === (await request(a, "/arena-test/identity")).id ? a : b;
    await host.page
      .getByRole("button", { name: "Bắt đầu trận", exact: true })
      .click();
    const rounds = { speed: 7, vocabulary: 10, listening: 5 }[mode];
    for (let round = 1; round <= rounds; round++) {
      const label = `Vòng ${round} / ${rounds}`;
      await Promise.all([
        a.page.waitForFunction(
          (label) =>
            document.querySelector(".arena-round")?.textContent === label,
          label,
        ),
        b.page.waitForFunction(
          (label) =>
            document.querySelector(".arena-round")?.textContent === label,
          label,
        ),
      ]);
      if (mode === "speed" && round === 2) {
        await a.page.reload();
        await a.page.waitForFunction(
          (label) =>
            document.querySelector(".arena-round")?.textContent === label,
          label,
        );
        reports.push("in-game reload resumes the server round");
      }
      if (mode === "listening") {
        await a.page.locator(".arena-fill button").waitFor();
        const prompt = await a.page.locator(".arena-question").innerText();
        const [prefix, suffix] = prompt.split("______");
        const original = "Please confirm the meeting tomorrow.";
        const answer = original.slice(
          prefix.length,
          original.length - suffix.length,
        );
        await a.page.locator("#arena-answer").fill(answer);
        await b.page.locator("#arena-answer").fill("wrong");
        await Promise.all([
          a.page.locator(".arena-fill button").click(),
          b.page.locator(".arena-fill button").click(),
        ]);
        assert(
          await a.page.locator("audio").evaluate((el) => el.readyState >= 1),
          "Audio metadata should load",
        );
        if (round === 1)
          await a.page.locator("audio").evaluate(async (el) => {
            await el.play();
            el.pause();
          });
      } else {
        await Promise.all([
          a.page.locator(".arena-answers button").nth(0).click(),
          b.page.locator(".arena-answers button").nth(1).click(),
        ]);
      }
      if (round === 1)
        await a.page.screenshot({ path: `${out}/${mode}-game.png` });
    }
    await Promise.all([
      a.page.locator(".arena-result").waitFor(),
      b.page.locator(".arena-result").waitFor(),
    ]);
    await a.page.screenshot({ path: `${out}/${mode}-result.png` });
    const history = await request(a, "/arena/history");
    assert.equal(history[0].id, id);
    const ledger = await request(a, "/arena/transactions");
    const lobby = await request(a, "/arena/lobby");
    assert.equal(
      lobby.balance,
      1000 + ledger.reduce((sum, t) => sum + t.xp_amount, 0),
    );
    reports.push(
      `${mode}: two authenticated browsers completed ${rounds} rounds; history, ledger and XP balance agree`,
    );
    console.log(`${mode}: complete`);
    await Promise.all([
      a.page.getByRole("button", { name: "Chơi tiếp", exact: true }).click(),
      b.page.getByRole("button", { name: "Chơi tiếp", exact: true }).click(),
    ]);
  }
  await a.page
    .getByRole("button", { name: "Lịch sử & BXH", exact: true })
    .click();
  await a.page.locator(".arena-history li").first().waitFor();
  await a.page.screenshot({ path: `${out}/history.png` });
  assert(
    await a.page.getByRole("heading", { name: "Giao dịch XP" }).isVisible(),
  );
  await a.page.keyboard.press("Escape");
  await a.page.getByRole("button", { name: "Xem toàn bộ BXH" }).click();
  await a.page.getByRole("dialog").waitFor();
  assert(await a.page.locator(".arena-dialog .arena-champion").isVisible());
  reports.push(
    "history, XP transactions and full leaderboard render server records",
  );
  await a.page.keyboard.press("Escape");
  // Resume persisted waiting room after reload, then refund once.
  await a.page.getByRole("button", { name: "Tạo phòng", exact: true }).click();
  await a.page.getByRole("button", { name: "Xác nhận tạo phòng" }).click();
  await a.page.locator(".arena-room-code strong").waitFor();
  const code = await a.page.locator(".arena-room-code strong").innerText();
  await a.page.reload();
  await a.page.locator(".arena-room-code strong").waitFor();
  assert.equal(
    await a.page.locator(".arena-room-code strong").innerText(),
    code,
  );
  await a.page.route("**/arena/matches/*", (route) => route.abort());
  await a.page
    .getByText("Đang kết nối lại… Trận đấu và XP vẫn được lưu.")
    .waitFor();
  await a.page.unroute("**/arena/matches/*");
  await a.page
    .getByText("Đang kết nối lại… Trận đấu và XP vẫn được lưu.")
    .waitFor({ state: "detached" });
  assert.equal(
    await a.page.locator(".arena-room-code strong").innerText(),
    code,
  );
  reports.push(
    "temporary network failure reconnects to the same persisted room",
  );
  await a.page
    .getByRole("button", { name: "Hủy tìm / Rời phòng", exact: true })
    .click();
  await a.page.locator(".arena-result").waitFor();
  assert.match(
    await a.page.locator(".arena-result").innerText(),
    /XP cược đã được hoàn lại/,
  );
  reports.push("reload restores private room; leave cancels and refunds");
  const unexpected = errors.filter((e) => !e.includes("net::ERR_FAILED"));
  assert.deepEqual(
    unexpected,
    [],
    "Browser console/page errors outside the declared offline probe",
  );
  reports.push("no browser console errors or uncaught page errors");
  await fs.writeFile(
    `${out}/results.json`,
    JSON.stringify(
      {
        reports,
        errors: unexpected,
        expectedOfflineErrors: errors.length - unexpected.length,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ reports, errors: unexpected }, null, 2));
} finally {
  await browser.close();
}
