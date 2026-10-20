// Hands a Playwright MCP session a signed-in bench session without a password (D-651).
//
//   node browser/bench-session-serve.mjs [window-b@bench.intelcost.io]      (run in the background)
//
// Listens on 127.0.0.1:5199. Each GET /session mints a fresh session for the account in the api's
// process (`drives/bench-session.py`, which refuses anything but the bench's test members) and answers
// it as JSON. `browser/mcp-signin.js` and `browser/mcp-perf-rows.js` fetch it from the MCP's own process
// and put it in the page's storage, so no token or password passes through a command line, a file or
// a session's transcript. Serves at most 8 sessions, only to 127.0.0.1, and stops after 15 minutes.

import { execFile } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const email = process.argv[2] ?? "window-b@bench.intelcost.io";
const infra = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let served = 0;

const mint = () =>
  new Promise((resolve, reject) => {
    execFile(
      "docker",
      ["compose", "exec", "-T", "api", "sh", "-lc", `cd /srv && PYTHONPATH=/srv python drives/bench-session.py ${email}`],
      { cwd: infra, env: { ...process.env, MSYS_NO_PATHCONV: "1" } },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(String(stderr || error.message).slice(0, 300)));
        const line = String(stdout).trim().split("\n").pop();
        try {
          const parsed = JSON.parse(line);
          if (!parsed.accessToken || !parsed.refreshToken) throw new Error("no tokens");
          resolve(line);
        } catch {
          reject(new Error("bench-session answered no session"));
        }
      },
    );
  });

const server = createServer(async (req, res) => {
  const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "");
  if (!local || req.method !== "GET" || req.url !== "/session" || served >= 8) {
    res.writeHead(403).end();
    return;
  }
  served += 1;
  try {
    const session = await mint();
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }).end(session);
    console.log(`served session ${served} for ${email}`);
  } catch (error) {
    res.writeHead(500).end(String(error.message));
  }
});
server.listen(5199, "127.0.0.1", () => console.log(`bench-session-serve: ${email} on 127.0.0.1:5199, 15 minutes`));
setTimeout(() => server.close(() => process.exit(0)), 15 * 60 * 1000).unref();
