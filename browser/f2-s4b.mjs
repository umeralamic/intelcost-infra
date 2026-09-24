// F2-S4b — getTokens() validates shape, so a bad localStorage value never sends an
// empty Bearer header.
//
// The surviving half of F2-S4, which D-17 dropped as a whole. The control was a
// Supabase workaround; this is not. Was P-17 in FEATURES.md, pulled into F2.

import { APP, SEEDED, expect, run } from "./lib/bench.mjs";

const KEY = "intelcost.session";

/** Every Authorization header the page sends, so "Bearer " with nothing after it is
 *  caught rather than assumed absent. */
const watchAuthHeaders = (page) => {
  const seen = [];
  page.on("request", (request) => {
    const header = request.headers().authorization;
    if (header !== undefined) seen.push(`${request.method()} ${new URL(request.url()).pathname} → "${header}"`);
  });
  return seen;
};

/** Writes a raw value into localStorage on the app's origin, then reloads onto it. */
const withStored = async (page, raw, path = "/login") => {
  await page.goto(`${APP}${path}`);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, raw]);
  await page.reload({ waitUntil: "networkidle" });
};

const stored = (page) => page.evaluate((k) => localStorage.getItem(k), KEY);

await run("f2-s4b", [
  {
    title: "unparseable JSON → the sign-in form renders and the key is removed",
    run: async ({ page }) => {
      await withStored(page, "{{{");
      expect(await page.$("#email"), "no sign-in form; the page may have crashed");
      expect((await stored(page)) === null, "the malformed key is still in localStorage");
      return "form renders, intelcost.session removed";
    },
  },
  {
    title: 'an empty accessToken → signed out, and no "Bearer " header ever goes out',
    run: async ({ page }) => {
      const seen = watchAuthHeaders(page);
      await withStored(page, '{"accessToken":"","refreshToken":"x"}');
      expect(await page.$("#email"), "not treated as signed out");
      expect((await stored(page)) === null, "the half-valid key is still in localStorage");
      const empty = seen.filter((entry) => /"Bearer ?"$/.test(entry));
      expect(empty.length === 0, `an empty Bearer header went out: ${empty.join(", ")}`);
      return `signed out, key removed, ${seen.length} Authorization headers sent (none empty)`;
    },
  },
  {
    title: "a missing refreshToken → the same, since half a session is not one",
    run: async ({ page }) => {
      await withStored(page, '{"accessToken":"looks-real-enough"}');
      expect(await page.$("#email"), "not treated as signed out");
      expect((await stored(page)) === null, "the half-valid key is still in localStorage");
      return "signed out, key removed";
    },
  },
  {
    title: "a real session survives untouched",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      await page.fill("#email", SEEDED.email);
      await page.fill("#password", SEEDED.password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
      const raw = await stored(page);
      expect(raw, "signing in stored no session");
      const parsed = JSON.parse(raw);
      expect(parsed.accessToken && parsed.refreshToken, "the stored session is not whole");
      await page.reload({ waitUntil: "networkidle" });
      expect(!(await page.$("#email")), "a valid session was cleared by the reload");
      return "signed in, session stored whole, survives a reload";
    },
  },
  {
    title: "a garbage accessToken on a real session → resolved, not a spinner or a loop",
    run: async ({ page }) => {
      const seen = watchAuthHeaders(page);
      await page.goto(`${APP}/login`);
      await page.fill("#email", SEEDED.email);
      await page.fill("#password", SEEDED.password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
      // Shape-valid, server-invalid: exactly the case validation cannot catch and the
      // 401-refresh path must.
      await page.evaluate((k) => {
        const session = JSON.parse(localStorage.getItem(k));
        session.accessToken = "garbage";
        localStorage.setItem(k, JSON.stringify(session));
      }, KEY);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(3000);
      const settled = Boolean(await page.$("#email")) || page.url().includes("/login")
        ? "landed on /login"
        : "refreshed and stayed in";
      const meCalls = seen.filter((entry) => entry.includes("/api/auth/me")).length;
      expect(meCalls < 10, `looping: ${meCalls} calls to /api/auth/me`);
      const empty = seen.filter((entry) => /"Bearer ?"$/.test(entry));
      expect(empty.length === 0, `an empty Bearer header went out: ${empty.join(", ")}`);
      return `${settled}, ${meCalls} /api/auth/me calls, no empty Bearer`;
    },
  },
  {
    title: "signing out removes the key",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      await page.fill("#email", SEEDED.email);
      await page.fill("#password", SEEDED.password);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
      await page.click('button:has-text("Sign out"), a:has-text("Sign out")');
      await page.waitForURL(/\/login/, { timeout: 20000 });
      expect((await stored(page)) === null, "intelcost.session survived sign out");
      return "intelcost.session absent after sign out";
    },
  },
]);
