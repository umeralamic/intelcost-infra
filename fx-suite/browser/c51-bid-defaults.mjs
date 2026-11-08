// C51, the bid summary's filled defaults (D-933).
//
//   ./fx-suite.sh run c51-bid-defaults
//
// The world: a new workspace and its projects.
//   1. A new workspace starts on overhead 10, profit 10, each marked IntelCost's starting figure; no contingency.
//   2. The bond follows the project's type: 1.5 on a Public project, 0 on a private one.
//   3. The tax follows the location, state plus average local (D-941), until it is typed; a typed rate survives a move.
//   4. A project at all zeros is offered the workspace's defaults; a saved bid does not move by itself.

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";

const { token, base } = await freshWorkspace("C51 Bid");
const pub = await makeProject(token, base, { name: "Public", project_type: "public", state: "TX" });
const shop = await makeProject(token, base, { name: "Shop", project_type: "commercial", state: "Texas" });
const bid = async (p) => (await apiCall(token, "GET", `${base}/${p.uuid}/estimate/bid`)).body;
const save = async (p, body) => apiCall(token, "PUT", `${base}/${p.uuid}/estimate/bid`, { tax_pct: 0, overhead_pct: 0, profit_pct: 0, bond_pct: 0, extra: [], ...body });

await run("c51-bid-defaults", [
  {
    title: "a new workspace's starting figures; the bond by the project's type",
    run: async () => {
      const [a, b] = [await bid(pub), await bid(shop)];
      expect(a.inherited && Number(a.overhead_pct) === 10 && Number(a.profit_pct) === 10, JSON.stringify(a));
      expect(a.extra.length === 0, "a markup on a new workspace");
      expect(a.sources.overhead === "starting", JSON.stringify(a.sources));
      expect(Number(a.bond_pct) === 1.5 && Number(b.bond_pct) === 0, `bond ${a.bond_pct}, ${b.bond_pct}`);
      return "10, 10, bond 1.5 on Public, 0 on private";
    },
  },
  {
    title: "the tax follows the location, labelled state plus average local, and a typed rate stays",
    run: async () => {
      let a = await bid(shop);
      expect(Number(a.tax_pct) === 8.2 && /Texas, state 6.25 % plus the state.s average local rate/.test(a.tax_note ?? ""), JSON.stringify(a));
      await apiCall(token, "PATCH", `${base}/${shop.uuid}`, { state: "Oregon" });
      a = await bid(shop);
      expect(Number(a.tax_pct) === 0, `Oregon ${a.tax_pct}`);
      await save(shop, { tax_pct: 7, overhead_pct: 5 });
      await apiCall(token, "PATCH", `${base}/${shop.uuid}`, { state: "TX" });
      a = await bid(shop);
      expect(Number(a.tax_pct) === 7 && a.sources.tax === "project", JSON.stringify(a));
      return "Texas 8.20, Oregon 0, typed 7 kept";
    },
  },
  {
    title: "a project at all zeros is offered the defaults",
    run: async () => {
      const made = await save(pub, { tax_pct: 6.25 });
      expect(made.status === 200, `save ${made.status}`);
      await save(pub, { tax_pct: 0 });
      const a = await bid(pub);
      expect(a.all_zero === true && !a.inherited, JSON.stringify(a));
      return "offered";
    },
  },
]);
