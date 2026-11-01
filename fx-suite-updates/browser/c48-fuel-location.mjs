// C48, the fuel a project reads from its location (D-928).
//
//   ./fx-suite.sh run c48-fuel-location
//
// The world: one throwaway project. EIA's most specific series that covers it, nothing written:
//   1. Texas: gasoline the state's, diesel the Gulf Coast's, propane the state's;
//   2. Nevada: no state series for any fuel: gasoline and diesel West Coast less California, propane the US average;
//   3. a typed price stands through a change of location, and the series is still offered;
//   4. no state: the US average.

import { apiCall, expect, run } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";

const { token, base } = await freshWorkspace("C48 Fuel");
const project = await makeProject(token, base, { name: "Fuel", state: "TX" });
const lib = `${base}/${project.uuid}/estimate/equipment-library`;
const fuel = async () => (await apiCall(token, "GET", `${lib}/bundle`)).body;
const areas = (b) => ["diesel", "gasoline", "propane"].map((k) => b.project_fuel[`fuel_price_${k}`].area).join(" | ");
const move = async (state) => {
  const moved = await apiCall(token, "PATCH", `${base}/${project.uuid}`, { state });
  expect(moved.status === 200, `state: ${moved.status}`);
};

await run("c48-fuel-location", [
  {
    title: "Texas: the state's gasoline and propane, the Gulf Coast's diesel",
    run: async () => {
      const b = await fuel();
      expect(areas(b) === "PADD 3 | TX | TX", areas(b));
      expect(b.project_fuel.fuel_price_gasoline.week_of >= "2026-10-26", JSON.stringify(b.project_fuel.fuel_price_gasoline));
      return areas(b);
    },
  },
  {
    title: "Nevada, written out: no state series; the region's, and the US average for propane",
    run: async () => {
      await move("Nevada");
      const b = await fuel();
      expect(areas(b) === "PADD 5 less CA | PADD 5 less CA | US", areas(b));
      return areas(b);
    },
  },
  {
    title: "a typed price is not overwritten by a change of location",
    run: async () => {
      const set = await apiCall(token, "PUT", `${lib}/override`, { entity: "setting", entity_key: "fuel_price_diesel", field: "value", value_num: 5.25 });
      expect(set.status === 200, `typed: ${set.status}`);
      await move("TX");
      const b = await fuel();
      const typed = b.overrides.find((o) => o.entity_key === "fuel_price_diesel");
      expect(Number(typed?.value_num) === 5.25, JSON.stringify(typed));
      expect(b.project_fuel.fuel_price_diesel.area === "PADD 3", "the series is still there to offer");
      return "5.25 kept, the Gulf Coast's offered";
    },
  },
  {
    title: "no state: the US average",
    run: async () => {
      await move(null);
      const b = await fuel();
      expect(areas(b) === "US | US | US", areas(b));
      return areas(b);
    },
  },
]);
