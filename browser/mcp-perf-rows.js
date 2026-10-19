async (loader) => {
  // Timing at size (row virtualisation, D-646, D-647), run in a Playwright MCP session after mcp-guard.js, with
  // browser_run_code_unsafe's `filename`. It loads `page.context().__perfRun(page, opts)`; call that with
  //   { app: "http://localhost:5175", project: "<BENCH DUP uuid>", sheet: "<sheet uuid>", steps: ["open", ...] }
  // It refuses a project the api does not name "BENCH DUP … — delete me". Signs in as window-b on `app` if
  // that origin holds no session, landing on Account settings, never Home.
  //
  // Every timed step ends when the end state shows and the page is quiet: from then on 15 frames in a row each
  // within 25 ms. The time reported runs to the first of those 15 frames, the end of the work. Scroll and the
  // canvas run for 3 s each and report fps (frames over the span), the 95th-percentile frame and the worst.
  //
  // Steps: open (sheet image and Takeoff panel drawn, from a cold load), dom, expand (the panel collapsed to
  // folders, then Expand one level twice), scroll (the panel), search (no match), clear (every row back),
  // ctrla (Ctrl+A on the sheet), est (Estimating's first row, cold), estscroll, estsearch, estclear,
  // estctrla (pick every row), pan, zoom.
  loader.context().__perfRun = async (page, opts) => {
  if (!page.context().__protectedRefusals) throw new Error("Run mcp-guard.js first (D-542).");
  if (!opts?.app || !opts.project || !opts.sheet) throw new Error("Set page.context().__perf = { app, project, sheet, steps }.");
  const API = "http://localhost:8000";
  const WORKSPACE = "69a35a11-ad9f-4a93-8f97-7f3f89f7d6b9";
  const out = { app: opts.app };

  // ── sign in on this origin, landing on Account settings (`keep`: go on with the page already open) ──
  if (opts.keep && !page.url().includes(opts.project)) throw new Error("keep: the open page is not this project");
  if (!opts.keep) {
  await page.goto(`${opts.app}/login?next=${encodeURIComponent("/settings/account")}`);
  await page.waitForFunction(() => location.pathname === "/settings/account" || Boolean(document.querySelector("#email")), null, { timeout: 30000 });
  // The login page shows its form for a moment before a held session moves it on.
  await page.waitForTimeout(1500);
  if (new URL(page.url()).pathname !== "/settings/account") {
    await page.fill("#email", "window-b@bench.intelcost.io");
    await page.fill("#password", "bench-password-1");
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname === "/settings/account", { timeout: 30000 });
  }
  const name = await page.evaluate(
    async ({ api, ws, uuid }) => {
      const { accessToken } = JSON.parse(localStorage.getItem("intelcost.session") ?? "{}");
      const r = await fetch(`${api}/api/workspace/${ws}/project/${uuid}`, { headers: { authorization: `Bearer ${accessToken}` } });
      return r.ok ? (await r.json()).name : null;
    },
    { api: API, ws: WORKSPACE, uuid: opts.project },
  );
  if (!/^BENCH DUP .* — delete me$/.test(name ?? "")) throw new Error(`${opts.project} is not a bench duplicate (${name}).`);
  }

  // ── in-page helpers ──
  const settle = (from) =>
    page.evaluate(
      (from) =>
        new Promise((resolve) => {
          let last = performance.now();
          let run = 0;
          let runStart = last;
          const tick = (now) => {
            const d = now - last;
            last = now;
            if (d < 25) {
              if (run === 0) runStart = now - d;
              run += 1;
            } else run = 0;
            if (run >= 15) resolve(Math.round(runStart - (from ?? 0)));
            // Never quiet within 10 minutes: reported as -1, not waited on.
            else if (now - (from ?? 0) > 600000) resolve(-1);
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      from,
    );
  const now = () => page.evaluate(() => performance.now());
  const frames = async (drive, ms = 3000) => {
    await page.evaluate(() => {
      window.__frames = [];
      let last = performance.now();
      window.__framesOn = true;
      const tick = (t) => {
        window.__frames.push(t - last);
        last = t;
        if (window.__framesOn) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await drive(ms);
    return page.evaluate(() => {
      window.__framesOn = false;
      const d = window.__frames.slice(1);
      const total = d.reduce((s, x) => s + x, 0);
      const sorted = [...d].sort((a, b) => a - b);
      return { fps: Math.round((d.length / total) * 1000 * 10) / 10, p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0), worst: Math.round(sorted.at(-1) ?? 0), frames: d.length };
    });
  };
  const dom = () => page.evaluate(() => ({ nodes: document.getElementsByTagName("*").length, heapMB: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576) }));
  const panel = "[data-quantity-panel]";
  const scrollBy = (selector, ms) =>
    page.evaluate(
      ({ selector, ms }) =>
        new Promise((resolve) => {
          const el = typeof selector === "string" ? document.querySelector(selector) : null;
          if (!el) return resolve(0);
          const start = performance.now();
          const span = el.scrollHeight - el.clientHeight;
          const tick = (t) => {
            const f = (t - start) / ms;
            // Down at 3,000 px/s, wrapping at the bottom.
            el.scrollTop = ((t - start) * 3) % Math.max(1, span);
            if (f < 1) requestAnimationFrame(tick);
            else resolve(span);
          };
          requestAnimationFrame(tick);
        }),
      { selector, ms },
    );
  const takeoffUrl = `${opts.app}/project/${opts.project}/takeoff/${opts.sheet}`;

  for (const step of opts.steps ?? ["open", "dom", "scroll", "search", "clear", "expand", "ctrla"]) {
    // A window Windows counts as covered gets one frame a second: every step would read as slow.
    await page.bringToFront();
    try {
      if (step === "open") {
        await page.goto(`${opts.app}/settings/account`);
        await page.waitForLoadState("load");
        await page.goto(takeoffUrl, { waitUntil: "commit", timeout: 900000 });
        // The panel's rows and the sheet's image, each timed too.
        await page.waitForFunction((panel) => document.querySelector(`${panel} [data-item-row]`) && !document.querySelector("[data-quantity-loading]"), panel, { timeout: 900000, polling: 50 });
        out.openRows = Math.round(await now());
        await page.waitForFunction(() => { const img = document.querySelector("[data-sheet-image]"); return img && (img.tagName === "CANVAS" ? getComputedStyle(img).visibility !== "hidden" : img.complete && img.naturalWidth > 0); }, null, { timeout: 900000, polling: 50 });
        out.openImage = Math.round(await now());
        await page.waitForFunction(
          (panel) => {
            const img = document.querySelector("[data-sheet-image]");
            const shown = img && (img.tagName === "CANVAS" ? getComputedStyle(img).visibility !== "hidden" : img.complete && img.naturalWidth > 0);
            return shown && document.querySelector(`${panel} [data-item-row]`) && !document.querySelector("[data-quantity-loading]");
          },
          panel,
          { timeout: 900000, polling: 100 },
        );
        out.open = await settle(0);
      } else if (step === "dom") {
        out.dom = await dom();
      } else if (step === "scroll") {
        // Scrolled once the page has stopped reading: a read landing mid-scroll is not the scroll's cost.
        await page.waitForLoadState("networkidle", { timeout: 120000 }).catch(() => undefined);
        await settle(0);
        const scroller = await page.evaluate((panel) => {
          const all = [...document.querySelectorAll(`${panel} *`)].filter((e) => e.scrollHeight > e.clientHeight + 10 && getComputedStyle(e).overflowY !== "visible");
          all.at(-1)?.setAttribute("data-perf-scroller", "panel");
          return all.length;
        }, panel);
        out.scroll = scroller ? await frames((ms) => scrollBy("[data-perf-scroller=panel]", ms)) : "no scroll";
      } else if (step === "search" || step === "estsearch") {
        const box = step === "search" ? page.getByLabel("Search items") : page.getByPlaceholder("Search…", { exact: true });
        const t0 = await now();
        await box.fill("zzqqzz");
        await page.waitForFunction((est) => (est ? !document.querySelector("[data-estimate-row]") : Boolean(document.querySelector("[data-no-match]"))), step === "estsearch", { timeout: 900000 });
        out[step] = await settle(t0);
      } else if (step === "clear" || step === "estclear") {
        const box = step === "clear" ? page.getByLabel("Search items") : page.getByPlaceholder("Search…", { exact: true });
        const t0 = await now();
        await box.fill("");
        await page.waitForFunction((sel) => Boolean(document.querySelector(sel)), step === "clear" ? `${panel} [data-item-row]` : "[data-estimate-row]", { timeout: 900000 });
        out[step] = await settle(t0);
      } else if (step === "expand") {
        await page.locator(panel).getByLabel("Collapse one level").click();
        await page.locator(panel).getByLabel("Collapse one level").click();
        await settle(0);
        const t0 = await now();
        await page.locator(panel).getByLabel("Expand one level").click();
        await page.locator(panel).getByLabel("Expand one level").click();
        await page.waitForFunction((panel) => Boolean(document.querySelector(`${panel} [data-item-row]`)), panel, { timeout: 900000 });
        out.expand = await settle(t0);
      } else if (step === "ctrla") {
        const box = await page.locator("[data-sheet-image]").first().boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.evaluate(() => document.activeElement?.blur?.());
        await page.keyboard.press("Escape");
        await page.keyboard.press("v");
        const t0 = await now();
        await page.keyboard.press("Control+a");
        out.ctrla = await settle(t0);
        await page.keyboard.press("Escape");
        await settle(0);
      } else if (step === "est") {
        await page.goto(`${opts.app}/settings/account`);
        await page.waitForLoadState("load");
        await page.goto(`${takeoffUrl}?tab=estimating`, { waitUntil: "commit", timeout: 900000 });
        await page.waitForFunction(() => Boolean(document.querySelector("[data-estimate-row]")), null, { timeout: 900000, polling: 50 });
        out.estFirstRow = Math.round(await now());
        out.est = await settle(0);
        out.estDom = await dom();
      } else if (step === "estscroll") {
        await page.waitForLoadState("networkidle", { timeout: 120000 }).catch(() => undefined);
        await settle(0);
        await page.evaluate(() => {
          const table = document.querySelector("[data-estimating] table");
          let el = table?.parentElement;
          while (el && !(el.scrollHeight > el.clientHeight + 10 && getComputedStyle(el).overflowY !== "visible")) el = el.parentElement;
          el?.setAttribute("data-perf-scroller", "est");
        });
        out.estscroll = await frames((ms) => scrollBy("[data-perf-scroller=est]", ms));
      } else if (step === "estctrla") {
        const pickAll = () => page.evaluate(() => { const t = performance.now(); document.querySelector("input[aria-label='Select every priced row shown']")?.click(); return t; });
        const t0 = await pickAll();
        out.estctrla = await settle(t0);
        await pickAll();
        await settle(0);
      } else if (step === "pan" || step === "zoom") {
        const box = await page.locator("[data-sheet-image]").first().boundingBox();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        await page.mouse.move(cx, cy);
        out[step] = await frames(async (ms) => {
          const end = Date.now() + ms;
          let i = 0;
          if (step === "pan") await page.mouse.down({ button: "middle" });
          while (Date.now() < end) {
            i += 1;
            if (step === "pan") await page.mouse.move(cx + 200 * Math.sin(i / 10), cy + 120 * Math.cos(i / 10));
            else await page.mouse.wheel(0, Math.sin(i / 8) > 0 ? -60 : 60);
            await page.waitForTimeout(16);
          }
          if (step === "pan") await page.mouse.up({ button: "middle" });
        });
      }
    } catch (error) {
      out[step] = `error: ${String(error.message ?? error).slice(0, 200)}`;
    }
  }
  out.refused = [...page.context().__protectedRefusals];
  return out;
  };
  return "loaded";
}
