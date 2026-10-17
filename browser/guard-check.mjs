// The guard check (D-542, D-601): the three copies of the protected list hold the same projects
// and founder workspaces. The api's scripts (scripts/protected.py), the bench helpers
// (lib/protected.mjs) and the Playwright MCP guard (mcp-guard.js, written out because its sandbox
// cannot import). Run by ../fingerprint.sh at the start and end of every run. Reads files only.
//
//   node browser/guard-check.mjs

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FOUNDER_EMAILS, FOUNDER_WORKSPACES, PROTECTED_PROJECTS } from "./lib/protected.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
const block = (text, start) => {
  const at = text.indexOf(start);
  if (at < 0) return "";
  return text.slice(at, text.indexOf("}", at));
};
const uuids = (text) => [...new Set(text.match(UUID) ?? [])].sort().join(" ");

const py = readFileSync(path.join(here, "../../intelcost-app-fastapi/scripts/protected.py"), "utf8");
const mcp = readFileSync(path.join(here, "mcp-guard.js"), "utf8");
const lists = {
  "lib/protected.mjs": {
    projects: uuids(Object.keys(PROTECTED_PROJECTS).join(" ")),
    workspaces: uuids(Object.keys(FOUNDER_WORKSPACES).join(" ")),
    emails: [...FOUNDER_EMAILS].sort().join(" "),
  },
  "scripts/protected.py": {
    // The test copy is named by its constant there.
    projects: uuids(block(py, "PROTECTED_PROJECTS: dict") + " " + (py.match(/TEST_COPY = "([^"]+)"/)?.[1] ?? "")),
    workspaces: uuids(block(py, "FOUNDER_WORKSPACES: dict")),
    emails: [...block(py, "FOUNDER_EMAILS").matchAll(/"([^"]+@[^"]+)"/g)].map((m) => m[1]).sort().join(" "),
  },
  "mcp-guard.js": {
    projects: uuids(block(mcp, "const PROTECTED = {")),
    workspaces: uuids(block(mcp, "const FOUNDER_WORKSPACES = {")),
    emails: [...(mcp.match(/const FOUNDER_EMAILS = \[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort().join(" "),
  },
};
const base = lists["lib/protected.mjs"];
let bad = 0;
for (const [file, list] of Object.entries(lists)) {
  for (const key of ["projects", "workspaces", "emails"]) {
    if (list[key] !== base[key] || !list[key]) {
      bad += 1;
      console.log(`FAIL ${file}: its ${key} differ from lib/protected.mjs's`);
    }
  }
}
console.log(
  `guard check: ${Object.keys(PROTECTED_PROJECTS).length} protected projects, ${Object.keys(FOUNDER_WORKSPACES).length} founder workspace, ${FOUNDER_EMAILS.length} founder accounts; ` +
    (bad ? `${bad} list(s) differ, FAILED` : "the three lists agree"),
);
for (const [uuid, name] of Object.entries(PROTECTED_PROJECTS)) console.log(`  ${uuid}  ${name}`);
process.exit(bad ? 1 : 0);
