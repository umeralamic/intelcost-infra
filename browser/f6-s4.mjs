// F6-S4: the formula engine, twice and equal (D-36 F6 Q1).
//
//   ./browser/f6-s4.sh      (from intelcost-infra/; regress.sh runs it)
//
// The shared table (`lib/formula-cases.mjs`, about a thousand rows) is written out by
// this fixture with GEN=1, read by the api's engine in the api container
// (`drives/f6-formula.py` → `.f6-python.json`), and then read here by the browser's own
// engine, imported from the dev server exactly as the app imports it. Every row must give
// the same number, to the bit, or the same error in the same words.

import { readFile, writeFile } from "node:fs/promises";

import { APP, expect, run } from "./lib/bench.mjs";
import { CASES, ENVS, PROBES } from "./lib/formula-cases.mjs";

const HERE = "/drive/scripts";

if (process.env.GEN === "1") {
  await writeFile(`${HERE}/.f6-cases.json`, JSON.stringify(CASES.map((c) => ({ ...c, env: ENVS[c.env] }))));
  console.log(`GEN ${CASES.length} cases`);
  process.exit(0);
}

let python;
let browser;

await run("f6-s4", [
  {
    title: "the api's engine read the table (drives/f6-formula.py)",
    run: async () => {
      python = JSON.parse(await readFile(`${HERE}/.f6-python.json`, "utf8"));
      expect(python.length === CASES.length && python.length >= 200, `${python.length} answers for ${CASES.length} rows`);
      const errors = python.filter((r) => !r.ok).length;
      return `${python.length} rows: ${python.length - errors} numbers, ${errors} errors`;
    },
  },
  {
    title: "AC1: the browser's engine gives the same answer for every row: the same number to the bit, or the same error in the same words",
    run: async ({ page }) => {
      await page.goto(`${APP}/login`);
      browser = await page.evaluate(
        async ({ cases, envs }) => {
          const { evaluateFormula } = await import("/src/lib/takeoff/subItems/formula.ts");
          const toMap = (o) => (o ? new Map(Object.entries(o)) : undefined);
          return cases.map(({ id, env, formula }) => {
            const e = envs[env];
            const result = evaluateFormula(formula, {
              ...e,
              subs: toMap(e.subs),
              vars: toMap(e.vars),
              dims: toMap(e.dims),
              refs: toMap(e.refs),
            });
            return { id, ...result };
          });
        },
        { cases: CASES, envs: ENVS },
      );
      const byId = new Map(python.map((r) => [r.id, r]));
      const differ = [];
      for (const b of browser) {
        const p = byId.get(b.id);
        const same = p && p.ok === b.ok && (b.ok ? Object.is(p.value, b.value) || p.value === b.value : p.error === b.error);
        if (!same) differ.push(`${b.id} ${JSON.stringify(CASES.find((c) => c.id === b.id).formula)}: browser ${JSON.stringify(b)} · api ${JSON.stringify(p)}`);
      }
      expect(differ.length === 0, `${differ.length} rows differ:\n${differ.slice(0, 25).join("\n")}`);
      const numbers = browser.filter((r) => r.ok).length;
      return `${browser.length} rows equal: ${numbers} numbers to the bit, ${browser.length - numbers} errors word for word`;
    },
  },
  {
    title: "AC2: no formula executes code; a malformed one is an error value",
    run: async () => {
      const formulaOf = new Map(CASES.map((c) => [c.id, c.formula]));
      const rows = browser.filter((r) => PROBES.includes(formulaOf.get(r.id)));
      const ran = rows.filter((r) => r.ok);
      expect(rows.length === PROBES.length * Object.keys(ENVS).length, `${rows.length} probe rows`);
      expect(ran.length === 0, `a probe computed: ${JSON.stringify(ran[0])}`);
      expect(browser.every((r) => typeof r.ok === "boolean"), "an answer was not a result");
      const words = [...new Set(rows.map((r) => r.error))];
      return `${rows.length} probe rows, every one an error value: ${words.join(" · ")}`;
    },
  },
]);
