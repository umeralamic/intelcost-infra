// contract-runner.js's engine half in node, with no browser and no api (D-1291): each contract's items built as the
// harness builds them and again by the app's own Calculate (`calculateUtilities`), the parity check between the two, and
// each item's trench per LF (walls, excavation, bedding and zone bought, backfill and the part bought). Nothing is
// written and nothing is priced (the runner's `parityOnly`). Use it before a pass to see that a config builds every item
// as the app does, and, for pass (b), whether step 1's app part (D-1289 Q2, Q4, Q5) has landed (the runner's
// `step1Probe`). No bid figure lives here: the contract list comes from docs/reference (outside git).
//
//   node --import ./bidtabs/engine-hook.mjs bidtabs/offline-parity.mjs "<pass config json>" "<marked contract list json>"
//        [--only=<key>,<key>] [--noWait] [--json=<out json>]
//   APP_SRC (engine-hook.mjs) points at another checkout of the app's src.
//
// The project's utility settings are the app's defaults (`DEFAULT_UTILITY_SETTINGS`, as a project that saved none reads
// them; the throwaway's are those), the company's embedment unset. The page's fetches are answered here: the settings
// read, and the pool / waiver writes taken and dropped. `--noWait` runs pass (b) on the presets as they are even when
// the probe fails (the parity of the marking, not of step 1).

import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import { APP_SRC_URL } from "./engine-hook.mjs";

const args = process.argv.slice(2);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
const flag = (k) => args.includes(`--${k}`);
const [cfgPath, listPath] = args.filter((a) => !a.startsWith("--"));

// The page's `ua.settingsOf` (features/.../api.ts) pulls the api client and import.meta.env; offline it is the app's
// default settings, read from trench.ts itself.
const stub = `import { DEFAULT_UTILITY_SETTINGS } from ${JSON.stringify(`${APP_SRC_URL}lib/takeoff/earthwork/utilities/trench.ts`)};
export function settingsOf(row, company) {
  return { ...structuredClone(DEFAULT_UTILITY_SETTINGS), ...(company ? { companyEmbedment: { pressure: company.pressure, flexible: company.flexible } } : {}) };
}`;
const hook = `
export async function resolve(spec, ctx, next) {
  if (spec === "/src/features/takeoff/earthwork/utilities/api.ts") return { url: "data:text/javascript," + encodeURIComponent(${JSON.stringify(stub)}), shortCircuit: true };
  return next(spec, ctx);
}`;
register("data:text/javascript," + encodeURIComponent(hook), import.meta.url);

const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const only = opt("only")?.split(",");
const list = JSON.parse(readFileSync(listPath, "utf8")).filter((c) => !only || only.includes(c.key));
const runner = (0, eval)(readFileSync(new URL("./contract-runner.js", import.meta.url), "utf8"));

globalThis.localStorage = { getItem: () => JSON.stringify({ accessToken: "offline" }) };
const answer = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if ((init.method ?? "GET") === "GET" && /\/earthwork\/utilities$/.test(u)) return answer({ settings: null, company_embedment: null });
  if (init.method === "PUT" && /equipment-library\/override$/.test(u)) return answer({ saved: true });
  throw new Error(`offline-parity: no answer for ${init.method ?? "GET"} ${u}`);
};

const out = [];
const t0 = Date.now();
for (const contract of list) {
  const inner = [];
  const ctx = { __ct: { ...cfg, workspace: "offline", project: "offline", sheet: "offline-sheet", contract, list: undefined, parityOnly: true, ...(flag("noWait") ? { requireStep1: false, requireUnderPavement: false } : {}) } };
  const page = {
    context: () => ctx,
    goto: async () => {},
    waitForFunction: async () => {},
    waitForTimeout: async () => {},
    evaluate: async (fn, arg) => {
      const r = await fn(arg);
      inner.push(r);
      return r;
    },
  };
  const c0 = Date.now();
  const [res] = await runner(page);
  const own = inner[0] ?? {};
  const items = contract.items.map((it, i) => {
    const t = own.crossing || own.notes ? (own.notes?.[i]?.trace ?? null) : (own.trace?.[i] ?? null);
    return { i, type: it.type, pipe: `${it.entry}:${it.nominal}`, depth: it.depth, qty: it.qty, limitedWidth: it.limitedWidth ?? null, limitedWhy: it.limitedWhy ?? null, underPavementBackfill: it.underPavementBackfill ?? null, trench: t };
  });
  out.push({ key: contract.key, ms: Date.now() - c0, result: res, parity: own.parity ?? [], interaction: own.interaction ?? [], sectionFlags: own.sectionFlags ?? [], coverFlags: own.coverFlags ?? [], ran: own.ran ?? null, items });
}

const f4 = (x) => (x == null || !Number.isFinite(x) ? "–" : x.toFixed(4));
const walls = (w) => (w ? Object.entries(w).map(([m, lf]) => `${m} ${Math.round(lf)}`).join(" / ") : "–");
for (const c of out) {
  const err = c.result?.error ?? null;
  console.log(`${c.key}: ${c.ms} ms; parity ${c.parity.length}; interaction ${c.interaction.length}${err ? `; ${err}` : ""}`);
  if (c.ran?.step1) for (const k of c.ran.step1.checks) console.log(`  step 1 ${k.q}: ${k.ok ? "in" : "NOT YET"} (${k.found})`);
  if (c.ran?.upbProbe) for (const k of c.ran.upbProbe.checks) console.log(`  under-pavement ${k.q}: ${k.ok ? "in" : "NOT YET"} (${k.found})`);
  for (const p of c.parity.slice(0, 3)) console.log(`  parity: ${p.pipe} ${p.type} ${p.depth ?? ""} ${p.qty} LF: harness ${p.harness.length} lines, app ${p.app.length}`);
  for (const it of c.items) {
    const t = it.trench;
    console.log(`  #${it.i} ${it.type} ${it.pipe}${it.depth != null ? ` at ${it.depth} ft` : ""} ${it.qty} LF ${it.limitedWidth ? "LIMITED" : "open"}${it.underPavementBackfill && it.underPavementBackfill !== "native" ? ` ${it.underPavementBackfill}` : ""}: walls ${walls(t?.walls)}; exc ${f4(t?.excCYLF)} emb ${f4(t?.impEmbCYLF)} bf ${f4(t?.backfillCYLF)} bought ${f4(t?.impBackfillCYLF)} (${t?.backfillBought ?? "none"}); ${t?.title ?? "–"}`);
  }
}
console.log(`${out.length} contract(s), ${out.reduce((t, c) => t + c.parity.length, 0)} parity difference(s), ${out.reduce((t, c) => t + c.interaction.length, 0)} interaction(s), ${Date.now() - t0} ms`);
if (opt("json")) writeFileSync(opt("json"), JSON.stringify(out, null, 1));
