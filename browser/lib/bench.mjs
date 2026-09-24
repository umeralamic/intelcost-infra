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
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

// Browser-facing. These are the addresses a page is opened at and the ones the
// bundle was compiled against, so they say localhost and the resolver rule below
// makes localhost mean the host.
export const APP = "http://localhost:5173";
export const API = "http://localhost:8000";
export const MAILHOG = "http://localhost:8025";

export const SEEDED = { email: "estimator@bench.intelcost.io", password: "bench-password-1" };

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

/** A run: a named list of steps, each reported pass or fail with its shot. */
export async function run(name, steps) {
  await mkdir(SHOTS, { recursive: true });
  const browser = await openBrowser();
  const results = [];

  for (const [index, step] of steps.entries()) {
    const n = index + 1;
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    page.on("pageerror", (e) => consoleErrors.push(String(e)));

    const shot = path.join(SHOTS, `${name}-step${n}.png`);
    let ok = false;
    let detail = "";
    try {
      detail = (await step.run({ page, context, shot })) ?? "";
      ok = true;
    } catch (error) {
      detail = error instanceof Error ? error.message.split("\n")[0] : String(error);
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
  const deadline = Date.now() + timeout;
  for (;;) {
    const response = await fetch(await fromNode(`${MAILHOG}/api/v2/messages?limit=30`));
    const { items } = await response.json();
    for (const item of items) {
      const to = item.Content.Headers.To?.join(",") ?? "";
      if (address && !to.includes(address)) continue;
      const body = item.Content.Body.replace(/=\r\n/g, "");
      const match = body.match(/accept-invite\?token=3D([A-Za-z0-9._~-]+)/);
      if (match) return match[1];
    }
    if (Date.now() > deadline) {
      throw new Error(`no invitation mail for ${address ?? "any address"} after ${timeout}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

export async function clearMail() {
  await fetch(await fromNode(`${MAILHOG}/api/v1/messages`), { method: "DELETE" });
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
  const deadline = Date.now() + timeout;
  for (;;) {
    const response = await fetch(await fromNode(`${MAILHOG}/api/v2/messages?limit=30`));
    const { items } = await response.json();
    for (const item of items) {
      const to = item.Content.Headers.To?.join(",") ?? "";
      if (address && !to.includes(address)) continue;
      const body = item.Content.Body.replace(/=\r\n/g, "");
      const match = body.match(/reset-password\?token=3D([A-Za-z0-9._~-]+)/);
      if (match) return match[1];
    }
    if (Date.now() > deadline) throw new Error(`no reset mail for ${address} after ${timeout}ms`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
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
export async function seatedMember(ownerToken, workspaceUuid, role, tag = "seat") {
  const email = `${tag}-${role}-${Date.now()}@bench.intelcost.io`;
  const password = "bench-password-1";
  await clearMail();
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
  const response = await fetch(await fromNode(`${API}${path}`), {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}
