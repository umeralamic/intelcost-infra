// The decision half of founder-gate.sh (D-1266). Reads the PreToolUse call (JSON) on stdin and prints what it
// would touch that the gate covers ("a save to <path>", "a bench migration (...)", "git <sub> in <repo>"), or
// nothing when the call is not gated. Prints "?" when it cannot read the call; the shell half then falls back to
// a plain pattern check. Data in, text out: it never blocks by itself.
//
// Gated:
//   - Edit, Write, MultiEdit, NotebookEdit on app or api source (APP and API below).
//   - Bash and PowerShell writes into the same paths: a redirect, tee, cp/mv/install/rsync (the last argument),
//     Set-Content/Add-Content/Out-File/New-Item, Copy-Item/Move-Item (-Destination or the last argument), and an
//     inline writeFileSync/appendFileSync/copyFileSync/WriteAllText/open(..., "w"). A relative target is read
//     against the command's last cd, else the session's cwd. Heredoc bodies are not read as commands.
//   - git commands that rewrite the working tree (checkout, switch, pull, merge, rebase, restore, revert,
//     cherry-pick, apply, am, clean, stash other than list/show, reset --hard/--merge/--keep) in the app or api
//     repo: the dev server and the api reload on them as on a save. A scratch worktree outside the repos is not.
//   - A bench migration: alembic upgrade/downgrade/stamp run in a container (docker exec, docker compose exec or
//     run) or at a command's start, unless the container is an fx one, the run is offline (--sql), or every
//     DATABASE_URL override names a database that is not the bench's.

const path = require("path").posix;

const APP =
  /(^|\/)intelcost-app-react\/(src\/|public\/|index\.html$|package\.json$|(vite|tailwind|postcss)\.config\.[cm]?[jt]s$|tsconfig[^/]*\.json$)/;
const API = /(^|\/)intelcost-app-fastapi\/(app\/|main\.py$|alembic\/)/;
const REPO = /(^|\/)intelcost-app-(react|fastapi)(\/|$)/;
const gated = (p) => APP.test(p) || API.test(p);

let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  let call;
  try {
    call = JSON.parse(input);
  } catch {
    process.stdout.write("?");
    return;
  }
  try {
    const what = decide(call);
    if (what) process.stdout.write(what);
  } catch {
    process.stdout.write("?");
  }
});

function unquote(s) {
  return String(s).trim().replace(/^(["'])(.*)\1$/s, "$2");
}

// A path in one spelling: forward slashes, a drive as /e/..., lower case (Windows paths are case-blind).
function norm(p) {
  let q = unquote(p).replace(/\\/g, "/");
  q = q.replace(/^([a-zA-Z]):/, (_, d) => "/" + d);
  q = q.replace(/^\/cygdrive\//i, "/");
  return q.toLowerCase();
}

function resolve(base, p) {
  const q = norm(p);
  if (q.startsWith("/")) return path.normalize(q);
  if (q.startsWith("~") || q.startsWith("$")) return q;
  return path.normalize(path.join(base || "/", q));
}

function decide(call) {
  const tool = String(call.tool_name || "");
  const t = call.tool_input || {};
  const cwd = call.cwd ? norm(call.cwd) : "";
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool)) {
    const f = t.file_path ?? t.notebook_path ?? t.path;
    if (!f) return "";
    return gated(resolve(cwd, f)) ? `a save to ${f}` : "";
  }
  if (/^(Bash|PowerShell)$/.test(tool)) {
    const cmd = String(t.command ?? "");
    return migration(cmd) || writes(cmd, cwd) || "";
  }
  return "";
}

// ---- the bench migration ---------------------------------------------------------------------------------

function migration(cmd) {
  const m = cmd.match(/\balembic\s+(?:-\S+\s+(?:[^\s-]\S*\s+)?)*?(upgrade|downgrade|stamp)\b/);
  if (!m) return "";
  if (/(^|\s)--sql\b/.test(cmd)) return "";
  let service = "";
  const dock = cmd.match(/\bdocker(?:\.exe)?\s+(?:compose\b[^\n;&|]*?\s|container\s+)?(?:exec|run)\s+([^\n;&|]*)/);
  if (dock) {
    const takesValue =
      /^(-e|--env|-w|--workdir|-u|--user|--name|--entrypoint|-v|--volume|-p|--publish|--env-file|--network|-l|--label|--index)$/;
    const toks = dock[1].trim().split(/\s+/);
    for (let i = 0; i < toks.length; i++) {
      const k = toks[i];
      if (k.startsWith("-")) {
        if (takesValue.test(k)) i++;
        continue;
      }
      service = unquote(k);
      break;
    }
  }
  const atStart =
    /(^|[\n;&|(`]|\bthen\b|\bdo\b|\b(?:ba)?sh\s+-l?c\s+["'])\s*(?:\w+=\S*\s+)*(?:env\s+(?:\w+=\S*\s+)*)?(?:poetry\s+run\s+|uv\s+run\s+|pipenv\s+run\s+|python3?(?:\.exe)?\s+-m\s+)?alembic\b/.test(
      cmd,
    );
  if (!dock && !atStart) return ""; // alembic named, not run (a grep, an echo)
  if (dock && /fx/i.test(service)) return ""; // the fx stack's own database, not the bench's
  const urls = [...cmd.matchAll(/DATABASE_URL\s*=\s*["']?([^\s"';`]+)/g)].map((x) => x[1]);
  if (urls.length && urls.every((u) => !benchUrl(u))) return ""; // a scratch Postgres
  return `a bench migration (alembic ${m[1]}${service ? ` in ${service}` : ""})`;
}

function benchUrl(u) {
  const m = u.match(/^[\w+.-]+:\/\/(?:[^@/]*@)?(\[[^\]]+\]|[^:/?]+)(?::(\d+))?\/([^?\s]*)/);
  if (!m) return true; // a variable or something unreadable: treat it as the bench
  const host = m[1].replace(/^\[|\]$/g, "").toLowerCase();
  const port = m[2] || "";
  if (m[3] !== "intelcost") return false;
  const hosts = ["postgres", "intelcost-infra-postgres-1", "localhost", "127.0.0.1", "::1", "host.docker.internal"];
  return hosts.includes(host) && ["", "5432", "5433"].includes(port);
}

// ---- writes from a shell ---------------------------------------------------------------------------------

function stripHeredocs(cmd) {
  const out = [];
  const ends = [];
  for (const line of cmd.split(/\r?\n/)) {
    if (ends.length) {
      if (line.replace(/^\t+/, "").trim() === ends[0]) ends.shift();
      continue;
    }
    out.push(line);
    for (const h of line.matchAll(/(?<!<)<<(?!<)-?\s*(["']?)([\w.-]+)\1/g)) ends.push(h[2]);
  }
  return out;
}

function splitSegments(line) {
  const segs = [];
  let cur = "";
  let q = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === q) q = "";
      cur += c;
      continue;
    }
    if (c === '"' || c === "'") {
      q = c;
      cur += c;
      continue;
    }
    if (c === ";" || c === "|" || (c === "&" && line[i + 1] === "&")) {
      segs.push(cur);
      cur = "";
      if (line[i + 1] === c) i++;
      continue;
    }
    cur += c;
  }
  segs.push(cur);
  return segs;
}

const words = (seg) => (seg.match(/"[^"]*"|'[^']*'|\S+/g) || []).map(unquote);

function writes(cmd, cwd) {
  let base = cwd;
  for (const line of stripHeredocs(cmd)) {
    for (const seg of splitSegments(line)) {
      const w = words(seg);
      while (w.length && /^\w+=/.test(w[0])) w.shift(); // VAR=value before the command
      if (!w.length) continue;
      const head = w[0].toLowerCase();
      const args = w.slice(1);
      const plain = args.filter((a) => !a.startsWith("-"));
      if (/^(cd|pushd|chdir|set-location|sl)$/.test(head)) {
        if (plain[0]) base = resolve(base, plain[0]);
        continue;
      }
      const targets = [];
      for (const r of seg.matchAll(/(?:^|[^<>=\d&-])(?:\d|&)?>>?\|?\s*("[^"]*"|'[^']*'|[^\s;&|<>()]+)/g))
        targets.push(r[1]);
      if (head === "tee") targets.push(...plain);
      if (/^(cp|mv|install|rsync|ln|copy-item|move-item|cpi|mi|copy|move)$/.test(head)) {
        const d = args.findIndex((a) => /^-destination$/i.test(a));
        if (d >= 0 && args[d + 1]) targets.push(args[d + 1]);
        else if (plain.length >= 2) targets.push(plain[plain.length - 1]);
      }
      if (/^(set-content|add-content|out-file|new-item|sc|ac)$/.test(head)) {
        const p = args.findIndex((a) => /^-(path|filepath|literalpath)$/i.test(a));
        if (p >= 0 && args[p + 1]) targets.push(args[p + 1]);
        else if (plain[0]) targets.push(plain[0]);
      }
      if (head === "git") {
        const what = gitRewrite(args, base);
        if (what) return what;
      }
      for (const tg of targets) {
        if (!tg || tg.startsWith("&") || tg.startsWith("$")) continue;
        if (gated(resolve(base, tg))) return `a save to ${tg}`;
      }
    }
  }
  // Inline writes in a script (node -e, python -c, a heredoc fed to an interpreter), read against the last cd.
  const inline = [
    /\b(?:writeFileSync|appendFileSync|writeFile|appendFile|createWriteStream)\(\s*["'`]([^"'`]+)["'`]/g,
    /\bcopyFileSync\(\s*["'`][^"'`]+["'`]\s*,\s*["'`]([^"'`]+)["'`]/g,
    /\bWriteAll(?:Text|Lines|Bytes)\(\s*["']([^"']+)["']/g,
    /\bopen\(\s*r?["']([^"']+)["']\s*,\s*["'][^"']*[wax][^"']*["']/g,
    /\b(?:write_text|write_bytes)\b[^\n]*?Path\(\s*r?["']([^"']+)["']\)/g,
  ];
  for (const re of inline)
    for (const r of cmd.matchAll(re)) if (gated(resolve(base, r[1]))) return `a save to ${r[1]}`;
  return "";
}

function gitRewrite(args, base) {
  let dir = base;
  let i = 0;
  for (; i < args.length; i++) {
    const a = args[i];
    if (a === "-C" && args[i + 1]) {
      dir = resolve(dir, args[++i]);
      continue;
    }
    if (a === "-c" || a === "--git-dir" || a === "--work-tree") {
      i++;
      continue;
    }
    if (a.startsWith("-")) continue;
    break;
  }
  const sub = (args[i] || "").toLowerCase();
  const rest = args.slice(i + 1);
  if (!REPO.test(dir)) return "";
  const rewrites =
    /^(checkout|switch|pull|merge|rebase|restore|revert|cherry-pick|apply|am|clean)$/.test(sub) ||
    (sub === "stash" && !/^(list|show)$/.test(rest[0] || "")) ||
    (sub === "reset" && rest.some((a) => /^--(hard|merge|keep)$/.test(a)));
  if (!rewrites) return "";
  const repo = dir.match(/intelcost-app-(react|fastapi)/)[0];
  return `git ${sub} in ${repo} (it rewrites the working tree the dev server or the api watches)`;
}
