// The decision half of founder-gate.sh (D-1266). Reads the PreToolUse call (JSON) on stdin and prints what it
// would touch that the gate covers ("a save to <path>", "a bench migration (...)", "git <sub> in <repo>"), or
// nothing when the call is not gated. Prints "?" when it cannot read the call; the shell half then falls back to
// a plain pattern check. Data in, text out: it never blocks by itself. After that first line, one line per
// `git commit` in the app, api or infra repo (D-1367, commitsOf below), and one per `git push` in the app, api,
// infra or marketing repo (D-1373, D-1381), for the shell half's pass-stamp check, or in the legacy repo (D-1388:
// always refused).
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
//   - (D-1279) docker exec and docker cp into a bench app or api container: `docker [container] exec|cp`,
//     `docker compose|docker-compose ... exec|cp`, naming a compose service api, app or worker* (worker,
//     worker-ocr, worker-pages, worker-previews) or its container intelcost-bench-<service>-<n>. A copy counts
//     when its destination is the container (/tmp included); a copy out of one is a read and passes. Every exec
//     counts, read-only ones too (the ruff/mypy gates): the agent runs founder-active first. fx services pass.
//   - (D-1279 Q27) a new container of the same code: `docker compose|docker-compose ... run` of the service api,
//     app or worker*, and `docker [container] run|create` of the image intelcost-bench-<api|app|worker*>[:tag]
//     (it mounts the same source and reaches the same database and bucket), `--rm ... true` included.

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
    // Line 1: the gated action (or nothing). Then one line per git commit (D-1367).
    const extra = commitsOf(call);
    if (what || extra.length) process.stdout.write([what, ...extra].join("\n"));
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
    return migration(cmd) || dockerInto(cmd) || writes(cmd, cwd) || "";
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

// ---- docker exec / cp into an app or api container (D-1279) ---------------------------------------------

// The bench's app and api services (compose names) and their containers; an fx one never matches.
const SERVICE = /^(api|app|worker[\w-]*)$/;
const CONTAINER = /^intelcost-bench-(api|app|worker[\w-]*)-\d+$/;
const benchBox = (name) => {
  const n = unquote(name).toLowerCase();
  return !/fx/.test(n) && (SERVICE.test(n) || CONTAINER.test(n));
};
// Their images (D-1279 Q27), with an optional tag or digest.
const IMAGE = /^(?:[\w.-]+\/)*intelcost-bench-(api|app|worker[\w-]*)(?:[:@][\w.:-]+)?$/;
const benchImage = (name) => {
  const n = unquote(name).toLowerCase();
  return !/fx/.test(n) && IMAGE.test(n);
};

// Skip a run of options; `withValue` names the ones that take the next word. Returns the next index.
function skipOpts(w, i, withValue) {
  while (i < w.length && w[i].startsWith("-")) {
    const a = w[i];
    i += !a.includes("=") && withValue.test(a) ? 2 : 1;
  }
  return i;
}

function dockerInto(cmd) {
  const DOCKER_OPTS = /^(-H|--host|--context|-c|--config|-l|--log-level|--tlscacert|--tlscert|--tlskey)$/;
  const COMPOSE_OPTS =
    /^(-f|--file|-p|--project-name|--profile|--env-file|--project-directory|--ansi|--progress|--parallel)$/;
  const EXEC_OPTS = /^(-e|--env|--env-file|-w|--workdir|-u|--user|--index|--detach-keys)$/;
  // compose run's options that take a value, and docker run's / create's.
  const CRUN_OPTS =
    /^(-e|--env|--env-from-file|-l|--label|-p|--publish|-v|--volume|-w|--workdir|-u|--user|--name|--entrypoint|--cap-add|--cap-drop|--pull)$/;
  const DRUN_OPTS =
    /^(-e|--env|--env-file|-l|--label|--label-file|-p|--publish|-v|--volume|--mount|-w|--workdir|-u|--user|--name|--entrypoint|--network|--net|--network-alias|-h|--hostname|--add-host|--dns|-m|--memory|--memory-swap|--cpus|--cpu-shares|-c|--platform|--pull|--restart|--runtime|--shm-size|--ulimit|--log-driver|--log-opt|--device|--cap-add|--cap-drop|--security-opt|--tmpfs|--volumes-from|--link|--ipc|--pid|--uts|--userns|--stop-signal|--stop-timeout|--health-cmd|--health-interval|--health-retries|--health-timeout|--cidfile|--gpus|--expose|-a|--attach|--detach-keys|--group-add|--isolation|--mac-address|--ip|--ip6|--cgroupns|--cgroup-parent|--storage-opt|--sysctl|--oom-score-adj|--pids-limit|--blkio-weight|--kernel-memory|--memory-reservation|--cpuset-cpus|--cpuset-mems|--cpu-period|--cpu-quota|--annotation|--domainname|--init-path)$/;
  for (const line of stripHeredocs(cmd)) {
    for (const seg of splitSegments(line)) {
      // A command inside sh -c "..." or a subshell is read as its own words too.
      const parts = [seg, ...[...seg.matchAll(/\b(?:ba)?sh\s+-l?c\s+(["'])([\s\S]*?)\1/g)].map((m) => m[2])];
      for (const part of parts) {
        for (const sub of splitSegments(part)) {
          const w = words(sub.replace(/^[\s(`]+/, ""));
          while (w.length && /^\w+=/.test(w[0])) w.shift();
          if (!w.length) continue;
          const head = w[0].toLowerCase().replace(/\.exe$/, "");
          let i = 1;
          let compose = false;
          if (head === "docker-compose") compose = true;
          else if (head === "docker") {
            i = skipOpts(w, i, DOCKER_OPTS);
            const s = (w[i] || "").toLowerCase();
            if (s === "compose") {
              compose = true;
              i++;
            } else if (s === "container") i++;
          } else continue;
          if (compose) i = skipOpts(w, i, COMPOSE_OPTS);
          const verb = (w[i] || "").toLowerCase();
          if (verb === "exec") {
            const j = skipOpts(w, i + 1, EXEC_OPTS);
            if (w[j] && benchBox(w[j])) return `a docker exec into ${unquote(w[j])} (an app or api container)`;
          } else if (verb === "cp") {
            const rest = w.slice(i + 1).filter((a) => !a.startsWith("-"));
            const dest = rest[rest.length - 1] || "";
            const m = dest.match(/^([^:/\\]+):/);
            if (rest.length >= 2 && m && !/^[a-z]$/i.test(m[1]) && benchBox(m[1]))
              return `a docker cp into ${dest} (an app or api container)`;
          } else if (verb === "run" && compose) {
            const j = skipOpts(w, i + 1, CRUN_OPTS);
            if (w[j] && benchBox(w[j])) return `a docker compose run of ${unquote(w[j])} (an app or api service)`;
          } else if (verb === "run" || verb === "create") {
            const j = skipOpts(w, i + 1, DRUN_OPTS);
            if (w[j] && benchImage(w[j])) return `a docker ${verb} of ${unquote(w[j])} (an app or api image)`;
          }
        }
      }
    }
  }
  return "";
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

// ---- git commit in the app, api or infra repo (D-1367); git push in any of our four repos (D-1373, D-1381) --

// One line per `git commit` the command runs in one of the three repos:
//   COMMIT\t<app|api|infra>\t<dir>     the shell half checks the pass stamp for the staged tree
//   COMMITBAD\t<app|api|infra>\t<why>  a commit of a tree other than the staged one (-a, -i, -o, a pathspec)
// and one per `git push` in the app, api, infra or marketing repo (D-1381):
//   PUSH\t<app|api|infra|market>\t<dir>      the shell half checks the pass stamp for the tree of the local umer-dev
//   PUSHBAD\t<app|api|infra|market>\t<why>   any form other than `git push [-n|--dry-run|-v|-q|--porcelain] origin umer-dev`
//   PUSHLEGACY\tlegacy\t<dir>                any push at all in the legacy repo intelcost/ (D-1388)
const INFRA = /(^|\/)intelcost-infra(\/|$)/;
function commitsOf(call) {
  const tool = String(call.tool_name || "");
  if (!/^(Bash|PowerShell)$/.test(tool)) return [];
  const cmd = String((call.tool_input || {}).command ?? "");
  if (!/\b(commit|push)\b/.test(cmd)) return [];
  const out = [];
  let base = call.cwd ? norm(call.cwd) : "";
  for (const line of stripHeredocs(cmd)) {
    for (const seg of splitSegments(line)) {
      const w = words(seg.replace(/^[\s(`]+/, ""));
      while (w.length && /^\w+=/.test(w[0])) w.shift();
      if (!w.length) continue;
      const head = w[0].toLowerCase().replace(/\.exe$/, "");
      const args = w.slice(1);
      if (/^(cd|pushd|chdir|set-location|sl)$/.test(head)) {
        const plain = args.filter((a) => !a.startsWith("-"));
        if (plain[0]) base = resolve(base, plain[0]);
        continue;
      }
      if (head !== "git") continue;
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
      if (sub === "push") {
        const kind = pushKind(dir);
        if (!kind) continue;
        if (kind === "legacy") {
          out.push(`PUSHLEGACY\tlegacy\t${dir}`);
          continue;
        }
        const why = pushOther(args.slice(i + 1));
        out.push(why ? `PUSHBAD\t${kind}\t${why}` : `PUSH\t${kind}\t${dir}`);
        continue;
      }
      if (sub !== "commit") continue;
      const m = dir.match(/intelcost-app-(react|fastapi)|intelcost-infra/);
      if (!m || !(REPO.test(dir) || INFRA.test(dir))) continue;
      const kind = m[0] === "intelcost-app-react" ? "app" : m[0] === "intelcost-app-fastapi" ? "api" : "infra";
      const why = commitTreeOther(args.slice(i + 1));
      out.push(why ? `COMMITBAD\t${kind}\t${why}` : `COMMIT\t${kind}\t${dir}`);
    }
  }
  return out;
}

// The repo a push runs in (D-1381: all four of ours), by the innermost repo folder named in its directory, or "".
const PUSH_REPOS = {
  "intelcost-app-react": "app",
  "intelcost-app-fastapi": "api",
  "intelcost-infra": "infra",
  "intelcost-market-next": "market",
};
// D-1388 (the founder's D-1384 Q6): the legacy repo `intelcost/` is read-only (fetch and pull only), so every push in
// it is refused. A folder named `intelcost` is legacy unless it is the workspace root itself (this hook's ../..), whose
// folder has the same name in lower case. The innermost match wins: intelcost/intelcost-infra is infra.
const WORKSPACE_ROOT = path.dirname(path.dirname(norm(__dirname)));
function pushKind(dir) {
  const segs = String(dir).split("/");
  for (let k = segs.length - 1; k >= 0; k--) {
    if (PUSH_REPOS[segs[k]]) return PUSH_REPOS[segs[k]];
    if (segs[k] === "intelcost" && segs.slice(0, k + 1).join("/") !== WORKSPACE_ROOT) return "legacy";
  }
  return "";
}

// Why a push is not the one form the gate reads (D-1373), or "". Fail closed: anything else is refused.
function pushOther(rest) {
  const SAFE = /^(-n|--dry-run|-v|--verbose|-q|--quiet|--porcelain)$/;
  const plain = [];
  for (const a of rest) {
    if (a.startsWith("-")) {
      if (!SAFE.test(a)) return `the option ${a}`;
      continue;
    }
    plain.push(a);
  }
  if (plain.length === 2 && plain[0] === "origin" && plain[1] === "umer-dev") return "";
  return plain.length ? `the remote and refspec "${plain.join(" ")}"` : "no remote and refspec";
}

// Why a commit's options would record a tree other than the staged index, or "".
function commitTreeOther(rest) {
  const LONG_VALUE =
    /^--(message|file|reuse-message|reedit-message|fixup|squash|author|date|template|cleanup|trailer|untracked-files)$/;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--") return rest.length > i + 1 ? "a pathspec after --" : "";
    if (/^--(all|include|only)$/.test(a)) return a;
    if (/^--pathspec-from-file\b/.test(a)) return "--pathspec-from-file";
    if (a.startsWith("--")) {
      if (!a.includes("=") && LONG_VALUE.test(a)) i++;
      continue;
    }
    if (a.startsWith("-") && a.length > 1) {
      // A cluster of short options: -am "msg" is -a -m "msg"; -m, -F, -C, -c, -t take the rest or the next word.
      for (let k = 1; k < a.length; k++) {
        const c = a[k];
        if ("aio".includes(c)) return `-${c}`;
        if ("mFCct".includes(c)) {
          if (k === a.length - 1) i++;
          break;
        }
      }
      continue;
    }
    return `a pathspec (${a})`;
  }
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
