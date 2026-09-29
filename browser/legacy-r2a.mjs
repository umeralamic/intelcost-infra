// Throwaway: drive legacy's canvas for founder check round 2, group A. Deleted after the run.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const origin = new URL(process.env.LEGACY_URL).origin;
const SHOTS = "/drive/scripts/shots";
await mkdir(SHOTS, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const say = (...a) => console.log(...a);
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(`${origin}/login`);
await page.fill("#email", process.env.LEGACY_EMAIL);
await page.fill("#password", process.env.LEGACY_PASSWORD);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/app/);
await page.getByRole("button", { name: /Perform takeoff for Bench comparison/ }).click();
await page.waitForURL(/\/takeoff/);
const sub = page.locator('canvas[data-role="pdf-substrate"]').first();
await sub.waitFor();
await wait(1500);
const panel = page.locator("#takeoff-measurements-outer");
const rows = async () => (await panel.locator("div.group").allInnerTexts()).map((t) => t.replace(/\n/g, " "));
say("rows at start:", JSON.stringify(await rows()));
const wrap = page.locator("div.bg-canvas").first();
const wb = await wrap.boundingBox();
const cx = wb.x + wb.width / 2, cy = wb.y + wb.height / 2;
const pageBox = () => sub.boundingBox();
const frac = async (x, y) => { const b = await pageBox(); return [((x - b.x) / b.width).toFixed(4), ((y - b.y) / b.height).toFixed(4)]; };

// 1. Zoom anchoring and scrollbars
const ax = wb.x + wb.width * 0.3, ay = wb.y + wb.height * 0.35;
say("frac under cursor before:", await frac(ax, ay));
await page.mouse.move(ax, ay);
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -100); await wait(120); }
await wait(500);
say("frac under cursor after 6 notches in:", await frac(ax, ay), "page", JSON.stringify(await pageBox()));
say("scroll metrics:", JSON.stringify(await wrap.evaluate((el) => {
  const all = [el, ...el.querySelectorAll("*")];
  const scrollers = all.filter((e) => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflow + s.overflowX + s.overflowY) && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1); });
  return { wrapOverflow: getComputedStyle(el).overflow, scrollers: scrollers.map((e) => e.className.toString().slice(0, 60)) };
})));
await page.screenshot({ path: `${SHOTS}/r2a-zoomed.png` });
// drag far with middle to see pan clamp
await page.mouse.move(cx, cy);
await page.mouse.down({ button: "middle" });
await page.mouse.move(cx + 1500, cy + 1200, { steps: 20 });
await page.mouse.up({ button: "middle" });
await wait(300);
say("page after huge middle drag:", JSON.stringify(await pageBox()));
await page.screenshot({ path: `${SHOTS}/r2a-panfar.png` });
await page.locator('button[title="Zoom to fit the whole sheet"]').click();
await wait(600);
// zoom button anchor
const pb0 = await pageBox();
await page.locator('button[title="Zoom in (up to 3000%)"]').last().click();
await wait(500);
say("frac at canvas centre after + button:", await frac(cx, cy), "before was", JSON.stringify(pb0));
await page.locator('button[title="Zoom to fit the whole sheet"]').click();
await wait(600);

// 3. Selection: click a row's markup, then empty canvas, then Escape
let pb = await pageBox();
const px = (fx, fy) => [pb.x + pb.width * fx, pb.y + pb.height * fy];
await page.getByRole("button", { name: "Select", exact: true }).first().click();
await wait(200);
const sfRow = panel.locator("div.group", { hasText: "SF 1" }).first();
await sfRow.click();
await wait(500);
const selected = async () => (await panel.locator("div.group.bg-row-selected").allInnerTexts()).map((t) => t.replace(/\n/g, " "));
say("selected after row click:", JSON.stringify(await selected()), "status:", JSON.stringify(await page.locator("body").evaluate(() => document.body.innerText.match(/Calculated:[^\n]*/)?.[0] ?? null)));
const [ex, ey] = px(0.9, 0.9);
await page.mouse.click(ex, ey);
await wait(500);
say("selected after empty canvas click:", JSON.stringify(await selected()));
await sfRow.click();
await wait(400);
await page.mouse.move(cx, cy);
await page.keyboard.press("Escape");
await wait(500);
say("selected after Escape:", JSON.stringify(await selected()));
await page.screenshot({ path: `${SHOTS}/r2a-esc.png` });

// 2. Box-drag with Area armed
const arm = async (name) => {
  await page.getByRole("button", { name, exact: true }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.waitFor({ timeout: 4000 }).catch(() => {});
  if (await dlg.count()) {
    say(`dialog on arming ${name}:`, await dlg.locator("h2").first().innerText());
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await dlg.waitFor({ state: "hidden" });
  }
  await wait(300);
};
await arm("Area");
say("area mode button title:", await page.locator('button[title^="Area —"]').first().getAttribute("title"));
const before = (await rows()).length;
let [x0, y0] = px(0.62, 0.62);
await page.mouse.move(x0, y0);
await page.mouse.down();
await page.mouse.move(x0 + 3, y0 + 3, { steps: 2 });
await wait(100);
await page.screenshot({ path: `${SHOTS}/r2a-press3.png`, clip: { x: x0 - 40, y: y0 - 40, width: 200, height: 200 } });
await page.mouse.move(x0 + 90, y0 + 60, { steps: 8 });
await page.screenshot({ path: `${SHOTS}/r2a-boxdrag.png`, clip: { x: x0 - 40, y: y0 - 40, width: 200, height: 160 } });
await page.mouse.up();
await wait(1000);
say("rows after Area box-drag:", (await rows()).length, "was", before, JSON.stringify(await rows()));
say("action group after area box commit:", JSON.stringify((await page.locator("button").allInnerTexts()).filter((t) => /^(Properties|Stop|Start|Discard|New Section|Resume|Deduct|Copy|Delete|Close|Arc|Undo)$/.test(t.trim()))));
// Area: right-click, no draft
await page.mouse.click(...px(0.5, 0.8), { button: "right" });
await wait(400);
say("area armed right-click no draft:", JSON.stringify(await page.locator("[role=menuitem]").allInnerTexts()));
await page.keyboard.press("Escape");
await wait(200);
// Area: two points then Enter
await page.mouse.click(...px(0.1, 0.8)); await wait(150);
await page.mouse.click(...px(0.2, 0.8)); await wait(150);
say("action group mid-draw (2 pts):", JSON.stringify((await page.locator("button").allInnerTexts()).filter((t) => /^(Properties|Stop|Start|Discard|New Section|Resume|Deduct|Copy|Delete|Close|Arc|Undo)$/.test(t.trim()))));
await page.mouse.click(...px(0.3, 0.7), { button: "right" });
await wait(300);
say("area armed right-click with draft:", JSON.stringify(await page.locator("[role=menuitem]").allInnerTexts()));
await page.keyboard.press("Escape");
await wait(200);
say("after Esc closing menu, draft points kept? tool:", await page.locator('button[title^="Area —"]').first().getAttribute("class").then((c) => c.includes("tool-active")));
await page.keyboard.press("Enter");
await wait(600);
say("rows after Enter with 2 area points:", (await rows()).length);
await page.screenshot({ path: `${SHOTS}/r2a-enter2.png` });
await page.keyboard.press("Escape");
await wait(300);
say("Area still armed after Esc:", await page.locator('button[title^="Area —"]').first().getAttribute("class").then((c) => c.includes("tool-active")));
await page.keyboard.press("Escape");
await wait(300);
say("Area still armed after 2nd Esc:", await page.locator('button[title^="Area —"]').first().getAttribute("class").then((c) => c.includes("tool-active")));

// Linear box-drag and Enter/Escape mid-run
await arm("Linear");
say("linear mode button title:", await page.locator('button[title^="Linear —"]').first().getAttribute("title"));
const bl = (await rows()).length;
[x0, y0] = px(0.62, 0.15);
await page.mouse.move(x0, y0);
await page.mouse.down();
await page.mouse.move(x0 + 90, y0 + 50, { steps: 8 });
await page.screenshot({ path: `${SHOTS}/r2a-linedrag.png`, clip: { x: x0 - 40, y: y0 - 40, width: 200, height: 160 } });
await page.mouse.up();
await wait(1000);
say("rows after Linear box-drag:", (await rows()).length, "was", bl, JSON.stringify(await rows()));
await page.mouse.click(...px(0.1, 0.1)); await wait(150);
await page.mouse.click(...px(0.2, 0.1)); await wait(150);
await page.mouse.click(...px(0.25, 0.15)); await wait(150);
await page.keyboard.press("Enter");
await wait(800);
say("rows after Enter with 3 linear points:", JSON.stringify(await rows()));
say("Linear still armed after Enter:", await page.locator('button[title^="Linear —"]').first().getAttribute("class").then((c) => c.includes("tool-active")));
await page.mouse.click(...px(0.1, 0.2)); await wait(150);
await page.mouse.click(...px(0.2, 0.2)); await wait(150);
await page.keyboard.press("Escape");
await wait(800);
say("rows after Escape with 2 linear points:", JSON.stringify(await rows()));
say("Linear still armed after 1st Esc:", await page.locator('button[title^="Linear —"]').first().getAttribute("class").then((c) => c.includes("tool-active")));
await page.keyboard.press("Escape");
await wait(300);
say("Linear still armed after 2nd Esc:", await page.locator('button[title^="Linear —"]').first().getAttribute("class").then((c) => c.includes("tool-active")));
await page.screenshot({ path: `${SHOTS}/r2a-end.png` });
await browser.close();
