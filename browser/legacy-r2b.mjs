// Throwaway: legacy's toolbar and action group states for round 2 group B. Deleted after the run.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const origin = new URL(process.env.LEGACY_URL).origin;
const SHOTS = "/drive/scripts/shots";
await mkdir(SHOTS, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2000, height: 900 } });
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
await page.screenshot({ path: `${SHOTS}/r2b-page.png` });
const group = async (label) => {
  const g = page.locator("div.bg-amber-100").first();
  if (!(await g.count())) { say(label, "group: none"); return; }
  const btns = await g.locator("button").evaluateAll((els) => els.map((e) => `${e.innerText.trim()}${e.disabled ? "(off)" : ""}[${e.title}]{${Math.round(e.querySelector("svg")?.getBoundingClientRect().width ?? 0)}}`));
  say(label, "group:", JSON.stringify(btns));
};
const toolbarRow = page.locator(".ic-toolbar-icons").first();
say("toolbar row box:", JSON.stringify(await toolbarRow.boundingBox()));
say("toolbar buttons:", JSON.stringify(await toolbarRow.locator("button").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); const s = e.querySelector("svg")?.getBoundingClientRect(); return `${e.innerText.trim() || "·"}|${e.title}|${Math.round(r.width)}x${Math.round(r.height)}|svg ${Math.round(s?.width ?? 0)}`; }))));
await page.screenshot({ path: `${SHOTS}/r2b-toolbar.png`, clip: { x: 1100, y: 60, width: 900, height: 64 } });
await group("nothing selected, Select tool:");
const panel = page.locator("#takeoff-measurements-outer");
await panel.locator("div.group", { hasText: "SF 1" }).first().click();
await wait(500);
await group("SF 1 selected:");
await page.screenshot({ path: `${SHOTS}/r2b-select.png`, clip: { x: 1100, y: 60, width: 900, height: 64 } });
await panel.locator("div.group", { hasText: "LF 2" }).first().click();
await wait(400);
await group("LF 2 selected:");
await panel.locator("div.group", { hasText: "COUNT 3" }).first().click();
await wait(400);
await group("COUNT selected:");
// arm Area
await page.getByRole("button", { name: "Area", exact: true }).first().click();
const dlg = page.getByRole("dialog");
await dlg.waitFor();
await group("Area dialog open:");
await page.getByRole("button", { name: "Create", exact: true }).click();
await dlg.waitFor({ state: "hidden" });
await wait(400);
await group("Area armed after dialog:");
await page.screenshot({ path: `${SHOTS}/r2b-armed.png`, clip: { x: 1100, y: 60, width: 900, height: 64 } });
const pb = await sub.boundingBox();
const px = (fx, fy) => [pb.x + pb.width * fx, pb.y + pb.height * fy];
await page.mouse.click(...px(0.1, 0.85)); await wait(150);
await page.mouse.click(...px(0.18, 0.85)); await wait(150);
await group("mid-draw (2 pts):");
await page.screenshot({ path: `${SHOTS}/r2b-draw.png`, clip: { x: 1100, y: 60, width: 900, height: 64 } });
await page.mouse.click(...px(0.18, 0.95)); await wait(150);
await page.mouse.dblclick(...px(0.1, 0.95)); await wait(1000);
await group("after double-click commit:");
await page.keyboard.press("Enter"); await wait(500);
await group("after Enter:");
await page.keyboard.press("Escape"); await wait(400);
await group("after Escape:");
await page.keyboard.press("Escape"); await wait(400);
await group("after 2nd Escape:");
// Stepper, header
say("stepper:", JSON.stringify(await page.locator('button[aria-label="Previous sheet"], button[aria-label="Next sheet"]').evaluateAll((els) => els.map((e) => [e.title, e.disabled]))));
say("header:", JSON.stringify(await page.locator("div.border-b").first().locator("button, div.font-semibold").evaluateAll((els) => els.map((e) => `${e.innerText.trim()}[${e.title}]`))));
await page.screenshot({ path: `${SHOTS}/r2b-corners.png`, clip: { x: 280, y: 740, width: 840, height: 120 } });
await browser.close();
