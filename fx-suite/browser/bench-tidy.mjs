// Clear fixture clutter from the seeded workspace, Bench Construction, through the api.
//
//   docker compose --profile browser run --rm browser node scripts/bench-tidy.mjs [--dry]
//
// Fixtures used to make their projects and seat their members in the seeded workspace
// and leave them there. Enough of them pushed Riverside Medical Center off the
// dashboard's first page (f2-s5 AC8), and filled the member list with hundreds of seats.
// Fixtures now make projects in fresh workspaces and discard them; this clears what the
// old runs left, and anything a fixture still leaves in the seeded workspace.
//
// What it takes is matched by name, never by age, so nothing a person made by hand is
// touched:
//   - a project named "<fixture prefix> <13-digit timestamp>" (the prefixes below)
//   - a member whose address is "<tag>-<role>-<13-digit timestamp>@bench.intelcost.io",
//     the form `seatedMember` makes, and never the owner
// Seeded data stays: the owner, Riverside Medical Center, and Sara W.
// (window-b@bench.intelcost.io), who is put back to Estimator if a check left her on
// another role.
//
// Prints what it removed; --dry prints it and removes nothing.

import { SEEDED, apiCall, apiLogin, discardProject, members, setRole } from "./lib/bench.mjs";

const PROJECT_PREFIXES = [
  "F4-S1 ",
  "F4-S2 dialog ",
  "F8-S4 topic ",
  "F8-S8 made while B was away ",
  "S6 probe ",
];
const FIXTURE_PROJECT = new RegExp(
  `^(${PROJECT_PREFIXES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}).*\\d{13}$`,
);
const FIXTURE_SEAT = /^[a-z0-9]+-[a-z_]+-\d{13}@bench\.intelcost\.io$/;
const SARA = "window-b@bench.intelcost.io";
const dry = process.argv.includes("--dry");

const token = await apiLogin();
const list = await apiCall(token, "GET", "/api/workspace");
const seeded = list.body.find((w) => w.slug === "bench-construction");
if (!seeded) throw new Error("no bench-construction workspace");
const base = `/api/workspace/${seeded.uuid}/project`;

// Every page of the live list, and the trash.
const projects = [];
for (let offset = 0; ; offset += 200) {
  const page = await apiCall(token, "GET", `${base}?limit=200&offset=${offset}`);
  if (page.status !== 200) throw new Error(`projects: ${page.status}`);
  projects.push(...page.body.items);
  if (page.body.items.length < 200) break;
}
const trash = await apiCall(token, "GET", `${base}/trash`);
projects.push(...(trash.body ?? []).map((p) => ({ uuid: p.uuid ?? p.project_uuid, name: p.name })));

const doomed = projects.filter((p) => FIXTURE_PROJECT.test(p.name));
const kept = projects.filter((p) => !FIXTURE_PROJECT.test(p.name)).map((p) => p.name);
for (const project of doomed) if (!dry) await discardProject(token, seeded.uuid, project.uuid);

const seats = (await members(token, seeded.uuid)).filter(
  (m) => m.role !== "owner" && m.email !== SEEDED.email && FIXTURE_SEAT.test(m.email),
);
for (const seat of seats) {
  if (dry) continue;
  const removed = await apiCall(token, "DELETE", `/api/workspace/${seeded.uuid}/member/${seat.user_uuid}`);
  if (removed.status !== 200) throw new Error(`remove ${seat.email}: ${removed.status}`);
}

const sara = (await members(token, seeded.uuid)).find((m) => m.email === SARA);
let saraNote = sara ? `Sara W. is ${sara.role}` : "Sara W. is not a member";
if (sara && sara.role !== "estimator" && !dry) {
  const set = await setRole(token, seeded.uuid, sara.user_uuid, "estimator");
  if (set.status !== 200) throw new Error(`Sara back to estimator: ${set.status}`);
  saraNote = `Sara W. put back to estimator (was ${sara.role})`;
}

console.log(`${dry ? "would remove" : "removed"} ${doomed.length} fixture projects and ${seats.length} fixture seats from ${seeded.name}`);
console.log(`kept projects: ${[...new Set(kept)].sort().join(", ")}`);
console.log(saraNote);
