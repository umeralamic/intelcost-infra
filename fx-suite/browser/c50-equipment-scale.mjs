// C50, equipment for the size of the job (D-932).
//
//   ./fx-suite.sh run c50-equipment-scale
//
// The world: throwaway projects, no drawings.
//   1. A new Residential project starts Compact; a new Commercial one Standard.
//   2. Changing the type of an existing project moves nothing: wanted Compact, applied Standard, until Apply.
//   3. A person's choice wins over the type, and Heavy prices as Standard.
//   4. The starter holds the Compact activities: none on a scraper or an articulated truck, every class with a rate.

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";

const { token, base } = await freshWorkspace("C50 Scale");
const home = await makeProject(token, base, { name: "Home", project_type: "residential" });
const shop = await makeProject(token, base, { name: "Shop", project_type: "commercial" });
const lib = (p) => `${base}/${p.uuid}/estimate/equipment-library`;
const scale = async (p) => (await apiCall(token, "GET", `${lib(p)}/scale`)).body;

await run("c50-equipment-scale", [
  {
    title: "a new project takes its type's scale: Residential Compact, Commercial Standard",
    run: async () => {
      const [a, b] = [await scale(home), await scale(shop)];
      expect(a.wanted === "compact" && a.applied === "compact", JSON.stringify(a));
      expect(b.wanted === "standard" && b.applied === "standard", JSON.stringify(b));
      return "Compact, Standard";
    },
  },
  {
    title: "a change of type moves nothing until Apply; a person's choice wins; Heavy is not Compact",
    run: async () => {
      await apiCall(token, "PATCH", `${base}/${shop.uuid}`, { project_type: "residential" });
      let s = await scale(shop);
      expect(s.wanted === "compact" && s.applied === "standard", JSON.stringify(s));
      await apiCall(token, "PATCH", `${base}/${shop.uuid}`, { equipment_scale: "heavy" });
      s = await scale(shop);
      expect(s.wanted === "heavy" && s.applied === "standard", JSON.stringify(s));
      await apiCall(token, "POST", `${lib(shop)}/scale/apply`, {});
      s = await scale(shop);
      expect(s.applied === "heavy", JSON.stringify(s));
      return "held until Apply; Heavy applied";
    },
  },
  {
    title: "the Compact activities: no scraper or articulated truck",
    run: async () => {
      const cfg = (await apiCall(token, "GET", `${base.replace(/\/project$/, "")}/equipment-library/earthwork-production`)).body;
      const small = cfg.activities.filter((a) => /C$/.test(a.national_key ?? ""));
      expect(small.length === 10, `Compact activities ${small.length}`);
      const machines = small.flatMap((a) => a.tiers.flatMap((t) => t.machines.map((m) => m.eq_class_key)));
      expect(!machines.some((k) => /^(SC-|ADT-)/.test(k)), machines.join());
      return `${small.length} activities, ${new Set(machines).size} classes`;
    },
  },
]);
