// C50, equipment for the size of the job (D-932).
//
//   ./fx-suite.sh run c50-equipment-scale
//
// The world: throwaway projects, no drawings.
//   1. A new project starts on Normal site access ("standard"), Residential or Commercial (D-1078; was Residential
//      Compact).
//   2. Changing the type moves nothing; Tight ("compact") is a person's choice, held until Apply (D-1078).
//   3. Heavy is gone: saved, it reads and applies as Normal (D-1078).
//   4. The starter holds the Compact activities: none on a scraper or an articulated truck, every class with a rate.

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";

const { token, base } = await freshWorkspace("C50 Scale");
const home = await makeProject(token, base, { name: "Home", project_type: "residential" });
const shop = await makeProject(token, base, { name: "Shop", project_type: "commercial" });
const lib = (p) => `${base}/${p.uuid}/estimate/equipment-library`;
const scale = async (p) => (await apiCall(token, "GET", `${lib(p)}/scale`)).body;

await run("c50-equipment-scale", [
  // D-1078 (api da923fa, 2026-11-08): "Equipment scale" is "Site access: Normal / Tight (compact machines)", Normal
  // ("standard") by default for every project whatever its type (Residential no longer starts Compact); Heavy is gone
  // and a project saved on it reads and prices as Normal (`wanted_scale`). Was: Residential Compact, Commercial
  // Standard; a change of type wanted Compact; Heavy applied as "heavy".
  {
    title: "a new project starts on Normal site access whatever its type (D-1078): Residential and Commercial both Standard",
    run: async () => {
      const [a, b] = [await scale(home), await scale(shop)];
      // D-1078: Residential is Normal too (was Compact).
      expect(a.wanted === "standard" && a.applied === "standard", JSON.stringify(a));
      expect(b.wanted === "standard" && b.applied === "standard", JSON.stringify(b));
      return "Standard, Standard";
    },
  },
  {
    title: "the type moves nothing (D-1078); Tight is the person's choice and waits for Apply; Heavy reads as Normal, not Compact",
    run: async () => {
      await apiCall(token, "PATCH", `${base}/${shop.uuid}`, { project_type: "residential" });
      let s = await scale(shop);
      // D-1078: the type no longer picks the scale (was wanted "compact").
      expect(s.wanted === "standard" && s.applied === "standard", JSON.stringify(s));
      await apiCall(token, "PATCH", `${base}/${shop.uuid}`, { equipment_scale: "compact" });
      s = await scale(shop);
      expect(s.wanted === "compact" && s.applied === "standard", JSON.stringify(s));
      await apiCall(token, "POST", `${lib(shop)}/scale/apply`, {});
      s = await scale(shop);
      expect(s.applied === "compact", JSON.stringify(s));
      // D-1078: Heavy is gone; saved, it reads as Normal (was wanted "heavy", applied "heavy").
      await apiCall(token, "PATCH", `${base}/${shop.uuid}`, { equipment_scale: "heavy" });
      s = await scale(shop);
      expect(s.wanted === "standard" && s.applied === "compact", JSON.stringify(s));
      await apiCall(token, "POST", `${lib(shop)}/scale/apply`, {});
      s = await scale(shop);
      expect(s.applied === "standard", JSON.stringify(s));
      return "type moves nothing; Tight held until Apply; Heavy read and applied as Normal";
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
