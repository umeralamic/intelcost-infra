// The bench's browser driver (D-16).
//
// A containerised Chromium pointed at the host's published ports, so that what it
// sees is what a browser on the host sees. The one trick is the resolver rule: the
// app bundle is compiled with VITE_API_URL=http://localhost:8000 because that is the
// address the BROWSER must resolve, and a browser inside a container resolves
// localhost to the container. Mapping localhost to the host gateway puts it back.
//
// These are fixtures, not a test suite. CLAUDE.md: testing is conducted, not written.

import { lookup } from "node:dns/promises";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium } from "playwright";

// Browser-facing. These are the addresses a page is opened at and the ones the
// bundle was compiled against, so they say localhost and the resolver rule below
// makes localhost mean the host.
// FX_APP points a run at the prod profile's built app (D-49), http://localhost:5175.
export const APP = process.env.FX_APP || "http://localhost:5173";
export const API = "http://localhost:8000";
export const MAILHOG = "http://localhost:8025";

export const SEEDED = { email: "estimator@bench.intelcost.io", password: "bench-password-1" };

// --- running beside other fixtures ------------------------------------------------
//
// regress.sh runs fixtures in parallel. A fixture therefore owns everything it touches:
// its accounts (fixtureOwner, seatedMember, and window B's person in lib/realtime.mjs),
// its workspaces, and the mail sent to its own addresses. It never assumes a window size
// or a page size, and it waits on what the page shows, never on a clock: the only timed
// waits are `quietFor`, a window in which something must NOT happen, and gesture pacing.

/** This fixture's name, as a tag for the addresses it mints: "f4-s3" → "f4s3". */
export const FIXTURE = path.basename(process.argv[1] ?? "fixture", ".mjs").replace(/[^a-z0-9-]/gi, "");
export const FIXTURE_TAG = FIXTURE.replace(/[^a-z0-9]/gi, "").toLowerCase() || "fixture";

let lastStamp = 0;
/** A 13-digit millisecond stamp, never the same twice in this process. */
export function stamp() {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

/**
 * Hold still and let time pass, for the one kind of check that needs it: proving that
 * something does NOT happen (no second socket, no reload, no event after a revoke).
 * Every other wait is on page state. Named so a reader, or a grep, can tell the two apart.
 */
export function quietFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make `workspaceUuid` the active workspace in the header's switcher, and wait until the
 * shell has drawn it: the switcher shows it and the person's standing in it has arrived.
 * Clicking on while the shell was still redrawing is what made f8-s2 AC4 and f8-s15 miss.
 */
export async function enterWorkspace(page, workspaceUuid) {
  const select = page.locator("header select");
  await select.locator(`option[value="${workspaceUuid}"]`).waitFor({ state: "attached", timeout: 20000 });
  // Always chosen, even when it already shows: choosing is what the app stores, and a
  // workspace shown only as the first of the list moves when a rename re-sorts it.
  await select.selectOption(workspaceUuid);
  await shellSettled(page, workspaceUuid);
}

/**
 * A file on this container's disk, for `setInputFiles(path)`. A buffer handed to
 * setInputFiles crosses the browser protocol as base64; 40 MB of it took over 30 s with
 * other fixtures running (f4-s7 AC8, 2026-09-27). A path is read by Chromium itself.
 */
export async function onDisk(name, buffer) {
  const dir = path.join(tmpdir(), `bench-${FIXTURE_TAG}-${stamp()}`);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, name);
  await writeFile(file, buffer);
  return file;
}

/**
 * The page has stopped changing: nothing marked busy or pulsing, and its size and text read
 * the same across several polls. For measuring a layout or taking a picture of it, where
 * "network idle plus a moment" measured a page still drawing.
 */
export async function pageSettled(page, { timeout = 20000 } = {}) {
  await page.waitForFunction(
    () => {
      const busy = document.querySelector('[aria-busy="true"], .animate-pulse') !== null;
      const doc = document.documentElement;
      const signature = [doc.scrollWidth, doc.scrollHeight, document.body.innerText.length].join("|");
      const state = (window.__pageSettled ??= { last: null, same: 0 });
      state.same = signature === state.last && !busy ? state.same + 1 : 0;
      state.last = signature;
      return state.same >= 3;
    },
    undefined,
    { polling: 150, timeout },
  );
  await page.evaluate(() => {
    window.__pageSettled = undefined;
  });
}

/** The shell has drawn: the switcher names the active workspace (this one, if given) and
 *  the person's role in it is shown, so capabilities have arrived. */
export async function shellSettled(page, workspaceUuid) {
  await page.waitForFunction(
    (uuid) => {
      const value = document.querySelector("header select")?.value;
      return Boolean(value) && (!uuid || value === uuid) && Boolean(document.querySelector("header [data-standing]"));
    },
    workspaceUuid ?? null,
    { timeout: 20000 },
  );
}

const SHOTS = "/drive/scripts/shots";

/** The host, as this container can reach it. Compose supplies host-gateway. */
let gatewayPromise;
function hostGateway() {
  gatewayPromise ??= lookup("host.docker.internal").then((r) => r.address);
  return gatewayPromise;
}

/**
 * The same service, addressed from Node rather than from the page.
 *
 * The resolver rule is a Chromium launch argument and reaches nothing else, so this
 * harness's own fetch still resolves localhost to the container. Every api helper
 * below goes through here; the page keeps using the localhost URLs above.
 */
async function fromNode(url) {
  return url.replace("localhost", await hostGateway());
}

export async function openBrowser() {
  const gateway = await hostGateway();
  const browser = await chromium.launch({
    args: [`--host-resolver-rules=MAP localhost ${gateway}`],
  });
  return browser;
}

/**
 * Whether the api and the worker run the code on disk (D-30), waited on for a restart
 * already under way. Every run asks before its first step, so no fixture reports on code
 * that is not the code in front of us. `bench-code.mjs` is the same question on its own.
 */
export async function codeIsCurrent(graceMs = process.env.REGRESS ? 240000 : 45000) {
  const deadline = Date.now() + graceMs;
  for (;;) {
    let seen = null;
    try {
      const response = await fetch(await fromNode(`${API}/health/code`));
      seen = response.ok ? await response.json() : { status: response.status };
    } catch (error) {
      seen = { unreachable: describeError(error) };
    }
    if (seen.current) return { ok: true, seen };
    if (Date.now() > deadline) return { ok: false, seen };
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

/** An error as a reader needs it: every line of the message, then its causes. A single
 *  first line hid what failed f4-s3 once, and a cause (a refused connection, a reset)
 *  is often the only part that says why. */
export function describeError(error) {
  const parts = [];
  for (let e = error, depth = 0; e && depth < 4; e = e.cause, depth += 1) {
    const text = e instanceof Error ? `${e.name === "Error" ? "" : `${e.name}: `}${e.message}` : String(e);
    parts.push(depth === 0 ? text : `caused by ${text}${e.code ? ` (${e.code})` : ""}`);
  }
  // Playwright appends a call log; enough of it to place the failure, not a page of it.
  return parts.join(" | ").replace(/\s*\n\s*/g, " / ").slice(0, 900);
}

/** A run: a named list of steps, each reported pass or fail with its shot. */
export async function run(name, steps) {
  await mkdir(SHOTS, { recursive: true });
  const code = await codeIsCurrent();
  if (!code.ok) {
    const s = code.seen;
    const short = (f) => (f ? f.slice(0, 12) : "no answer");
    console.log(`\n=== ${name} ===`);
    console.log("FAIL  0. The api and the worker run the code on disk (D-30)");
    console.log(
      s.unreachable || s.status
        ? `      /health/code: ${s.unreachable ?? s.status}`
        : `      disk ${short(s.on_disk)} · api ${short(s.api)} · worker ${short(s.worker)}`,
    );
    console.log(`\n0/${steps.length} passed (not run: the bench is running old code)`);
    process.exitCode = 1;
    return;
  }
  const browser = await openBrowser();
  const results = [];

  for (const [index, step] of steps.entries()) {
    const n = index + 1;
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    page.on("pageerror", (e) => consoleErrors.push(String(e)));
    // A console "Failed to load resource" line names no URL; this one does. ERR_ABORTED
    // is a request the page cancelled by navigating away, which every step does.
    page.on("requestfailed", (r) => {
      const reason = r.failure()?.errorText ?? "";
      if (reason !== "net::ERR_ABORTED") consoleErrors.push(`request failed: ${r.url().slice(0, 120)} ${reason}`);
    });

    const shot = path.join(SHOTS, `${name}-step${n}.png`);
    let ok = false;
    let detail = "";
    const started = Date.now();
    try {
      detail = (await step.run({ page, context, shot })) ?? "";
      ok = true;
    } catch (error) {
      detail = `${describeError(error)} [after ${((Date.now() - started) / 1000).toFixed(1)}s]`;
    }
    try {
      await page.screenshot({ path: shot, fullPage: false });
    } catch {
      /* a closed page cannot be shot; the failure above is the report */
    }
    await context.close();

    results.push({ n, title: step.title, ok, detail, shot, consoleErrors });
  }

  await browser.close();

  console.log(`\n=== ${name} ===`);
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.n}. ${r.title}`);
    if (r.detail) console.log(`      ${r.detail}`);
    if (r.consoleErrors.length) console.log(`      console: ${r.consoleErrors.join(" | ")}`);
    console.log(`      shot: ${r.shot}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
}

/** Delete every screenshot this driver wrote. CLAUDE.md: leave nothing stray. */
export async function clearShots() {
  await rm(SHOTS, { recursive: true, force: true });
}

// --- api helpers, so a fixture is set up in one call rather than ten clicks ------

export async function apiLogin(email = SEEDED.email, password = SEEDED.password) {
  const response = await fetch(await fromNode(`${API}/api/auth/login`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`login ${email}: ${response.status}`);
  return (await response.json()).access_token;
}

export async function apiRegister(email, password, fullName) {
  const response = await fetch(await fromNode(`${API}/api/auth/register`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  // 409 is fine: the fixture already exists from an earlier pass.
  if (!response.ok && response.status !== 409) {
    throw new Error(`register ${email}: ${response.status} ${await response.text()}`);
  }
  return response.status;
}

/**
 * This fixture run's own throwaway account, made on first use and reused for the rest of
 * the run: `fx.<fixture>.<stamp>@bench.intelcost.io`.
 *
 * **A fixture never makes a workspace as the seeded account.** Every workspace it makes
 * belongs to this account instead, so estimator@bench.intelcost.io's switcher holds only
 * Bench Construction and what the founder made by hand (it once held 860 fixture
 * workspaces). `regress.sh` ends by deleting every workspace a `fx.` account owns
 * (`drives/bench-workspaces.py`), and checks the seeded account gained none.
 */
let ownerPromise;
/** The run's owner's full name. Fixtures assert its short form through `A_NAME` in
 *  lib/realtime.mjs, never a literal: "Bench E." outlived the account it named once. */
export const OWNER_FULL_NAME = "Fixture Owner";
export function fixtureOwner() {
  ownerPromise ??= (async () => {
    // A phased fixture's later passes are the same run: the setup pass prints OWNER=…,
    // and its runner hands it back here.
    const email = process.env.FX_OWNER ?? `fx.${FIXTURE}.${stamp()}@bench.intelcost.io`;
    const password = SEEDED.password;
    await apiRegister(email, password, OWNER_FULL_NAME); // 409 on a phased run's later passes
    return { email, password, fullName: OWNER_FULL_NAME, token: await apiLogin(email, password) };
  })();
  return ownerPromise;
}

/** A workspace of this run's own, owned by `fixtureOwner()`. */
export async function ownWorkspace(name) {
  const owner = await fixtureOwner();
  const workspace = await createWorkspace(owner.token, name);
  return { owner, token: owner.token, workspace, base: `/api/workspace/${workspace.uuid}/project` };
}

/**
 * A workspace of this run's own account with roles-matrix editing shipped (F3-S13's flag),
 * for the fixtures that edit the matrix on screen. Rolling a flag out is an operator's act
 * with no api route, so it takes two passes and a drive, which `browser/lib/shipped.sh`
 * runs: the setup pass (SETUP=1) makes the workspace, prints SHIPPED=<name> and exits; the
 * drive ships the flag to it; the main pass finds it here by name.
 */
export async function shippedWorkspace(tag) {
  const owner = await fixtureOwner();
  if (process.env.SETUP === "1") {
    const made = await createWorkspace(owner.token, `${tag} ${Date.now()}`);
    console.log(`SHIPPED=${made.name}`);
    process.exit(0);
  }
  const listed = (await apiCall(owner.token, "GET", "/api/workspace")).body;
  const workspace = listed.find((w) => w.name === process.env.SHIPPED);
  if (!workspace) throw new Error("run this fixture through its .sh runner, which ships the flag first");
  return { owner, token: owner.token, workspace };
}

export async function firstWorkspace(token) {
  const response = await fetch(await fromNode(`${API}/api/workspace`), {
    headers: { authorization: `Bearer ${token}` },
  });
  const list = await response.json();
  if (!list.length) throw new Error("the seeded user has no workspace");
  return list[0];
}

export async function invite(token, workspaceUuid, email, role = "estimator") {
  const response = await fetch(await fromNode(`${API}/api/workspace/${workspaceUuid}/invitation`), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
  if (!response.ok) throw new Error(`invite ${email}: ${response.status} ${await response.text()}`);
  return response.json();
}

/** The newest invitation token in MailHog.
 *
 *  The body is quoted-printable: "=3D" is "=", and a trailing "=" before a CRLF is a
 *  soft line break that joins the halves with nothing between them. A token read
 *  without undoing both is a token the api rejects, which looks exactly like a bug in
 *  the screen under test.
 *
 *  **Polled, because mail is asynchronous and always was.** The api hands the message
 *  to a broker; a worker picks it up and talks to a relay. Reading MailHog the instant
 *  the api answers was a race this fixture happened to win, until D-20 moved the
 *  dispatch to after the commit and it started losing one in every run. Waiting for
 *  the mail is what a person does, and it is what the fixture should always have done. */
export async function inviteTokenFromMail(address, { timeout = 15000 } = {}) {
  return tokenFromMail(address, /accept-invite\?token=3D([A-Za-z0-9._~-]+)/, "invitation", timeout);
}

/**
 * MailHog is shared by every fixture running at once (regress.sh runs them in parallel),
 * so a fixture only ever reads, counts or deletes mail sent to its own addresses. Reading
 * "the newest 30 messages" missed a fixture's mail once others had sent more, and
 * deleting every message threw away a mail another fixture was about to read.
 */
async function mailTo(address) {
  const url = `${MAILHOG}/api/v2/search?kind=to&query=${encodeURIComponent(address)}&limit=250`;
  const { items, total } = await (await fetch(await fromNode(url))).json();
  // MailHog matches the query anywhere in the header: keep exact recipients only.
  const mine = (items ?? []).filter((item) =>
    (item.Content.Headers.To ?? []).some((to) => to.toLowerCase().includes(address.toLowerCase())),
  );
  return { items: mine, total: total ?? mine.length };
}

async function tokenFromMail(address, pattern, kind, timeout) {
  if (!address) throw new Error(`reading ${kind} mail needs the address it was sent to`);
  const deadline = Date.now() + timeout;
  for (;;) {
    // Newest first, so a re-sent mail wins over the one it replaced.
    for (const item of (await mailTo(address)).items) {
      const body = item.Content.Body.replace(/=\r\n/g, "");
      const match = body.match(pattern);
      if (match) return match[1];
    }
    if (Date.now() > deadline) throw new Error(`no ${kind} mail for ${address} after ${timeout}ms`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

/** Delete the mail sent to `address`, so the next mail read for it is a new one. Without an
 *  address it deletes nothing: other fixtures' mail is theirs. */
export async function clearMail(address) {
  if (!address) return;
  for (const item of (await mailTo(address)).items) {
    await fetch(await fromNode(`${MAILHOG}/api/v1/messages/${item.ID}`), { method: "DELETE" });
  }
}

/** A signed-in page, without clicking through the form every time. */
export async function signInThroughUi(page, email = SEEDED.email, password = SEEDED.password) {
  await page.goto(`${APP}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 });
}

export function expect(condition, message) {
  if (!condition) throw new Error(message);
  return true;
}

/** The invitation as the api describes it, for checking a fixture is the right one. */
export async function invitationPreview(token) {
  const response = await fetch(await fromNode(`${API}/api/invitation/${token}`));
  if (!response.ok) throw new Error(`preview ${token}: ${response.status}`);
  return response.json();
}

/** Waits out the invitation screen's own loading state.
 *
 *  Both /accept-invite and the invited /signup fetch the preview after they mount, so
 *  a step that reads the page the moment the URL changes reads "Checking your
 *  invitation" and reports a missing workspace name that is merely not there yet. */
export async function invitationSettled(page) {
  // Since P-18 the invitation screen is its own chunk: the page before it can still be
  // on screen for a moment after the URL changes. Wait for the invitation screen's own
  // reading state to show (it may already have passed), then for it to clear.
  await page
    .getByText("Reading the invitation")
    .first()
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  await page.waitForFunction(
    () => !document.body.textContent.includes("Reading the invitation"),
    undefined,
    { timeout: 20000 },
  );
}

/** The workspace's members, as the owner sees them. Used to count seats. */
export async function members(token, workspaceUuid) {
  const response = await fetch(await fromNode(`${API}/api/workspace/${workspaceUuid}/member`), {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`members: ${response.status} ${await response.text()}`);
  return response.json();
}

/** Accept an invitation as a signed-in user, straight at the api.
 *
 *  Returns the status alongside the body, because the interesting case is a SECOND
 *  accept of a token this same user already spent: that has to answer 200 with the
 *  workspace, not 409, or a retry after a reply that was lost dead-ends. */
export async function apiAccept(accessToken, inviteToken) {
  const response = await fetch(
    await fromNode(`${API}/api/invitation/${encodeURIComponent(inviteToken)}/accept`),
    { method: "POST", headers: { authorization: `Bearer ${accessToken}` } },
  );
  return { status: response.status, body: await response.json().catch(() => null) };
}

/** Withdraw an invitation, to make one that is no longer open. */
export async function revokeInvitation(token, workspaceUuid, invitationUuid) {
  const response = await fetch(
    await fromNode(`${API}/api/workspace/${workspaceUuid}/invitation/${invitationUuid}`),
    { method: "DELETE", headers: { authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`revoke: ${response.status} ${await response.text()}`);
  return response.json();
}

/** The trial-length answer, straight from the api. Optional country header.
 *
 *  Used to derive what the SCREEN must say rather than hard-coding a number in the
 *  fixture: the point of F2-S8 is that the page repeats what the resolver decided, so
 *  a pass that carried its own copy of "14" would still pass if the two drifted. */
export async function trialLength(headers = {}) {
  const response = await fetch(await fromNode(`${API}/api/auth/trial-length`), { headers });
  if (!response.ok) throw new Error(`trial-length: ${response.status}`);
  return response.json();
}

/** Create a workspace as this user. For fixtures that need a workspace of their own. */
export async function createWorkspace(token, name) {
  const response = await fetch(await fromNode(`${API}/api/workspace`), {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(`workspace: ${response.status} ${await response.text()}`);
  return response.json();
}

/** Ask for a password reset. Always 202, whatever the address. */
export async function requestReset(email) {
  const response = await fetch(await fromNode(`${API}/api/auth/password/forgot`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error(`forgot: ${response.status}`);
}

/** The newest reset token in MailHog for an address. Polled, like the invitation. */
export async function resetTokenFromMail(address, { timeout = 15000 } = {}) {
  return tokenFromMail(address, /reset-password\?token=3D([A-Za-z0-9._~-]+)/, "reset", timeout);
}

/** The caller's resolved standing in a workspace: role, capabilities, assignable roles.
 *
 *  This is the api's answer, and the whole point of F3-S1 is that it is the only one.
 *  A fixture that recomputed the map here would be checking a fixture, not a product. */
export async function capabilities(token, workspaceUuid) {
  const response = await fetch(
    await fromNode(`${API}/api/workspace/${workspaceUuid}/capability`),
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(`capability: ${response.status} ${await response.text()}`);
  return response.json();
}

/** Move a member to a role, straight at the api. Returns status and body, because a
 *  refusal is as interesting as a success once roles can be refused. */
export async function setRole(token, workspaceUuid, userUuid, role) {
  const response = await fetch(
    await fromNode(`${API}/api/workspace/${workspaceUuid}/member/${userUuid}`),
    {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ role }),
    },
  );
  return { status: response.status, body: await response.json().catch(() => null) };
}

/** A fresh account seated in a workspace at a given role, ready to sign in.
 *
 *  Built through the real invitation path rather than by writing a row: a member
 *  created by a shortcut is a member the api might never produce. */
export async function seatedMember(ownerToken, workspaceUuid, role, tag = FIXTURE_TAG) {
  // The default tag is the fixture's own name: a shared "seat" tag let two fixtures running
  // at once mint the same address in the same millisecond.
  const email = `${tag}-${role}-${stamp()}@bench.intelcost.io`;
  const password = "bench-password-1";
  await invite(ownerToken, workspaceUuid, email, role);
  const inviteToken = await inviteTokenFromMail(email);
  await apiRegister(email, password, `Bench ${role}`);
  const token = await apiLogin(email, password);
  const accepted = await apiAccept(token, inviteToken);
  if (accepted.status !== 200) {
    throw new Error(`seating ${email} as ${role}: ${accepted.status}`);
  }
  return { email, password, token };
}

/** A hand-written request, as someone bypassing the screen would send it.
 *
 *  Every "the control is not shown" assertion is worth nothing on its own: hiding is
 *  not a gate. This is how a fixture proves the api refuses it too. */
export async function apiCall(token, method, path, body) {
  const started = Date.now();
  let response;
  try {
    response = await fetch(await fromNode(`${API}${path}`), {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    // A network failure carries no address of its own; name the request, so a failure
    // under load says which call and how long it waited (2026-09-27: a connect timeout
    // in f5-sheet-items' setup could not be traced without it).
    throw new Error(`${method} ${path} failed after ${Date.now() - started} ms: ${error.message}`, { cause: error.cause ?? error });
  }
  return { status: response.status, body: await response.json().catch(() => null) };
}

/** Remove a project a fixture made, the way a person would: to Trash, then delete
 *  permanently, which also clears its storage. A project already trashed or already
 *  gone is fine; anything else throws, so a cleanup that did not happen is said. */
export async function discardProject(token, workspaceUuid, projectUuid) {
  const base = `/api/workspace/${workspaceUuid}/project/${projectUuid}`;
  const trashed = await apiCall(token, "DELETE", base);
  if (![200, 404, 409].includes(trashed.status)) {
    throw new Error(`trash ${projectUuid}: ${trashed.status} ${JSON.stringify(trashed.body)}`);
  }
  const purged = await apiCall(token, "DELETE", `${base}/purge`);
  if (![200, 404].includes(purged.status)) {
    throw new Error(`purge ${projectUuid}: ${purged.status} ${JSON.stringify(purged.body)}`);
  }
}

/** The roles matrix, as the api resolved it. */
export async function matrix(token, workspaceUuid) {
  const response = await fetch(await fromNode(`${API}/api/workspace/${workspaceUuid}/matrix`), {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`matrix: ${response.status} ${await response.text()}`);
  return response.json();
}

/** Sign in through the UI and land on the app. Most F3 fixtures start here. */
export async function signInAs(page, email, password = "bench-password-1") {
  await page.goto(`${APP}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });
}

/** A built-in role, retuned for one workspace. Sparse on purpose (F3-S6). */
export async function setOverride(token, workspaceUuid, role, capabilities, isDisabled = false) {
  return apiCall(token, "PUT", `/api/workspace/${workspaceUuid}/override/${role}`, {
    capabilities,
    is_disabled: isDisabled,
  });
}

export async function clearOverride(token, workspaceUuid, role) {
  return apiCall(token, "DELETE", `/api/workspace/${workspaceUuid}/override/${role}`);
}

/** Workspace-defined roles (F3-S7). */
export async function createCustomRole(token, workspaceUuid, label, capabilities) {
  return apiCall(token, "POST", `/api/workspace/${workspaceUuid}/custom-role`, {
    label,
    capabilities,
  });
}

export async function listCustomRoles(token, workspaceUuid) {
  const { body } = await apiCall(token, "GET", `/api/workspace/${workspaceUuid}/custom-role`);
  return body;
}

export async function deleteCustomRole(token, workspaceUuid, roleUuid) {
  return apiCall(token, "DELETE", `/api/workspace/${workspaceUuid}/custom-role/${roleUuid}`);
}

export async function assignCustomRole(token, workspaceUuid, userUuid, roleUuid) {
  return apiCall(
    token,
    "PUT",
    `/api/workspace/${workspaceUuid}/member/${userUuid}/custom-role`,
    { custom_role_uuid: roleUuid },
  );
}

/** Ownership transfer (F3-S9). */
export async function transferOwnership(token, workspaceUuid, target, confirmName) {
  return apiCall(token, "POST", `/api/workspace/${workspaceUuid}/ownership`, {
    user_uuid: target.userUuid ?? null,
    email: target.email ?? null,
    confirm_name: confirmName,
  });
}

export async function pendingTransfer(token, workspaceUuid) {
  const { body } = await apiCall(token, "GET", `/api/workspace/${workspaceUuid}/ownership`);
  return body;
}

export async function cancelTransfer(token, workspaceUuid) {
  return apiCall(token, "DELETE", `/api/workspace/${workspaceUuid}/ownership`);
}

/** The workspace's own details, and its logo (F3-S10). */
export async function updateWorkspace(token, workspaceUuid, fields) {
  return apiCall(token, "PATCH", `/api/workspace/${workspaceUuid}`, fields);
}

export async function readWorkspace(token, workspaceUuid) {
  const { body } = await apiCall(token, "GET", `/api/workspace/${workspaceUuid}`);
  return body;
}

export async function logoTicket(token, workspaceUuid, contentType, size) {
  return apiCall(
    token,
    "POST",
    `/api/workspace/${workspaceUuid}/logo?content_type=${encodeURIComponent(contentType)}&size=${size}`,
  );
}

/** A new link for an invitation already sent. Kills the old one (D-24). */
export async function relinkInvitation(token, workspaceUuid, invitationUuid) {
  return apiCall(
    token,
    "POST",
    `/api/workspace/${workspaceUuid}/invitation/${invitationUuid}/relink`,
  );
}

/** The raw token out of an acceptance URL, for driving an accept from a copied link. */
export function tokenFromLink(link) {
  return new URL(link).searchParams.get("token");
}

/** How many messages MailHog is holding.
 *
 *  Used to prove that an action sends none: "Get new link" mints a link and mails
 *  nothing, where Resend mails one (D-24). A count is the only way to tell the two
 *  apart from outside, because both produce a working link. */
export async function mailCount(address) {
  // Counted per address: other fixtures send mail while this one runs.
  if (!address) throw new Error("mailCount needs the address: other fixtures' mail is not this one's");
  return (await mailTo(address)).items.length;
}

/** The workspace audit feed (F3-S12). */
export async function activity(token, workspaceUuid, { limit = 100, offset = 0 } = {}) {
  const { status, body } = await apiCall(
    token,
    "GET",
    `/api/workspace/${workspaceUuid}/activity?limit=${limit}&offset=${offset}`,
  );
  return { status, body };
}

/** Which features are shipped in a workspace (F3-S13). */
export async function flags(token, workspaceUuid) {
  const { status, body } = await apiCall(
    token,
    "GET",
    `/api/workspace/${workspaceUuid}/flag`,
  );
  return { status, body };
}
