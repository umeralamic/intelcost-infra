// C40, delete protection (D-789), built after the archive (2026-10-26). Two accounts in one workspace: A (this
// run's owner) protects what A marks; B (Sara W., an Estimator) deletes it. A third, C, is seated as an Admin for
// the override.
//
//   ./fx-suite.sh run c40-delete-protection
//
// Asserted:
// - the api, rule by rule: Anyone deletes; Only people I choose keeps it for anyone not chosen and deletes for
//   the one chosen; No one without my approval makes a request; A's own delete and an Admin's always go;
// - mixed: a bulk delete of A's protected item and B's own deletes B's and keeps A's, the reply naming it; an item
//   of B's holding A's protected shape loses only B's shape; a layer with A's protected item on it stays;
// - a shapes change that would delete A's protected shape and also draw is refused whole, 403;
// - the screen: Settings › Collaboration saves the rule; B's row shows the shield; B's Delete asks "Marked by
//   <A>. Delete?"; the request makes "Delete requested by <B>" on both windows' rows; A's bell Approve deletes it;
//   B is told; Deny keeps it and B is told;
// - expiry: a request backdated 8 days (psql through c40-delete-protection.sh, lib/host-sql.mjs) lapses on A's next notice read, the item stays, B is told.
//
// Written, not run (the founder, 2026-10-26: fixtures added to the archived suite, run with the next full
// restore-from-tag run, hard rule 8).

import { APP, MAILHOG, apiCall, expect, run, seatedMember, serviceUrl, signInAs } from "./lib/bench.mjs";
import { hostSql } from "./lib/host-sql.mjs";
import { APP_B, WINDOW_B, secondWindow, signInAt, waitFor } from "./lib/realtime.mjs";
import { openSheet, row } from "./lib/takeoff.mjs";
import { riversideWorld } from "./lib/world.mjs";

const world = await riversideWorld();
const r = world.r;
const A = world.token;
const B = world.sara.token;
const t = r.takeoff;
await apiCall(A, "PATCH", `/api/workspace/${r.workspace}`, { collaboration_mode: "work_together" });
const admin = await seatedMember(A, r.workspace, "admin");

const me = async (token) => (await apiCall(token, "GET", "/api/auth/me")).body;
const rule = (token, prefs) => apiCall(token, "PATCH", "/api/auth/me", { collaboration_prefs: prefs });
const area = (name, at, token = A) =>
  apiCall(token, "POST", `${t}/item`, {
    name,
    type: "sf",
    unit: "SF",
    sheet_uuid: r.sheet,
    geometry: { geom_type: "sf", vertices_json: [[at, 0.6], [at + 0.05, 0.6], [at + 0.05, 0.65], [at, 0.65]], shape_meta: { closed: true }, client_uuid: crypto.randomUUID() },
  }).then((res) => {
    expect(res.status === 201, `item ${name}: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body;
  });
const gone = async (uuid) => (await apiCall(A, "GET", `${t}/item/${uuid}`)).status === 404;
/** Mail captured for an address by the bench's guard, by template (D-792). */
const mailTo = async (address, template) => {
  // From the browser container MailHog is reached by its service name, not the published port.
  const url = `${MAILHOG}/api/v2/search?kind=to&query=${encodeURIComponent(address)}&limit=50`;
  const found = await (await fetch(serviceUrl(url) ?? url)).json();
  return (found.items ?? []).filter((m) => (m.Content.Headers["X-IntelCost-Template"] ?? []).includes(template)).map((m) => m.Content.Headers.Subject?.[0] ?? "");
};
const reset = () => rule(A, { delete_protection: null, delete_allowed: null });

await run("c40-delete-protection", [
  {
    title: "D-789 at the api: Anyone, Only people I choose (not chosen, chosen), approval, the owner's own and an Admin's",
    run: async () => {
      const said = [];
      await rule(A, { delete_protection: "anyone" });
      const one = await area("C40 anyone", 0.05);
      expect((await apiCall(B, "DELETE", `${t}/item/${one.uuid}`)).status === 200 && (await gone(one.uuid)), "Anyone: B's delete did not take it");
      said.push("anyone: gone");

      await rule(A, { delete_protection: "chosen", delete_allowed: [] });
      const two = await area("C40 chosen", 0.12);
      const refused = await apiCall(B, "DELETE", `${t}/item/${two.uuid}`);
      expect(refused.status === 200 && refused.body.kept.length === 1 && !(await gone(two.uuid)), `chosen, not B: ${JSON.stringify(refused.body)}`);
      await rule(A, { delete_allowed: [(await me(B)).uuid] });
      expect((await apiCall(B, "DELETE", `${t}/item/${two.uuid}`)).status === 200 && (await gone(two.uuid)), "chosen, B chosen: not deleted");
      said.push(`chosen: kept for B ("${refused.body.detail}"), gone once B is chosen`);

      await rule(A, { delete_protection: "approve", delete_allowed: null });
      const three = await area("C40 approve", 0.19);
      const asked = await apiCall(B, "DELETE", `${t}/item/${three.uuid}`);
      expect(asked.body.asked.length === 1 && !(await gone(three.uuid)), `approve: ${JSON.stringify(asked.body)}`);
      const rules = (await apiCall(B, "GET", `${t}/delete-rules`)).body;
      expect(rules.requests.some((q) => q.item_uuid === three.uuid), "the request is not listed in delete-rules");
      said.push(`approve: a request ("${asked.body.detail}")`);

      const own = await area("C40 own", 0.26);
      expect((await apiCall(A, "DELETE", `${t}/item/${own.uuid}`)).status === 200 && (await gone(own.uuid)), "A could not delete A's own");
      const adminToken = admin.token;
      const four = await area("C40 admin", 0.33);
      expect((await apiCall(adminToken, "DELETE", `${t}/item/${four.uuid}`)).status === 200 && (await gone(four.uuid)), "the Admin's delete did not take it");
      said.push("own and Admin: gone");
      await reset();
      return said.join("; ");
    },
  },
  {
    title: "D-789 mixed: bulk keeps A's and deletes B's; a shape of A's in B's item stays; a layer with A's item stays; a draw-and-delete change is refused whole",
    run: async () => {
      await rule(A, { delete_protection: "chosen", delete_allowed: [] });
      const mine = await area("C40 A slab", 0.05);
      const theirs = await area("C40 B slab", 0.12, B);
      const bulk = await apiCall(B, "POST", `${t}/item/delete`, { item_uuids: [mine.uuid, theirs.uuid] });
      expect(bulk.status === 200 && (await gone(theirs.uuid)) && !(await gone(mine.uuid)), `bulk: ${JSON.stringify(bulk.body)}`);
      expect(bulk.body.kept.some((k) => k.item === mine.uuid && k.owner), "the reply does not name what was kept and whose");

      // B's item, with a shape of A's added to it: B deleting the item takes B's shape only.
      const host = await area("C40 B host", 0.2, B);
      const added = await apiCall(A, "POST", `${t}/item/${host.uuid}/geometry`, { geom_type: "sf", vertices_json: [[0.2, 0.7], [0.25, 0.7], [0.25, 0.75], [0.2, 0.75]], shape_meta: { closed: true }, sheet_uuid: r.sheet });
      expect(added.status === 201, `A's shape: ${added.status}`);
      const partial = await apiCall(B, "DELETE", `${t}/item/${host.uuid}`);
      const left = (await apiCall(B, "GET", `${t}/item/${host.uuid}`)).body;
      expect(left.geometries.length === 1 && left.geometries[0].uuid === added.body.uuid, `partial: ${JSON.stringify(partial.body)}`);

      // A shapes change that also draws: refused whole.
      const mixed = await apiCall(B, "POST", `${t}/item/${host.uuid}/shapes`, {
        delete: [{ uuid: added.body.uuid, geometry_version: added.body.geometry_version }],
        create: [{ geom_type: "sf", vertices_json: [[0.3, 0.7], [0.35, 0.7], [0.35, 0.75]], shape_meta: { closed: true }, sheet_uuid: r.sheet }],
      });
      expect(mixed.status === 403, `draw-and-delete: ${mixed.status} ${JSON.stringify(mixed.body)}`);

      // A layer holding A's protected item: B's "Delete layer and all its measurements" keeps the layer.
      const layer = (await apiCall(A, "POST", `${t}/layer`, { name: "C40 layer" })).body;
      await apiCall(A, "POST", `${t}/item/bulk`, { item_uuids: [mine.uuid], layer_uuid: layer.uuid });
      const layerGone = await apiCall(B, "DELETE", `${t}/layer/${layer.uuid}?with_contents=true`);
      const layers = (await apiCall(A, "GET", `${t}/layer`)).body;
      expect(layers.some((l) => l.uuid === layer.uuid) && !(await gone(mine.uuid)), `layer: ${JSON.stringify(layerGone.body)}`);
      await reset();
      return `bulk "${bulk.body.detail}"; item kept A's shape ("${partial.body.detail}"); draw-and-delete 403; layer "${layerGone.body.detail}"`;
    },
  },
  {
    title: "D-789 on screen: the rule from Settings, the shield, Marked by, Delete requested on both windows, Approve and Deny from the bell, B told",
    run: async ({ page, context, shot }) => {
      const b = await secondWindow(context);
      try {
        await signInAs(page, world.owner.email, world.owner.password, "/settings/collaboration");
        await page.locator('[data-delete-protection] [data-value="approve"]').click();
        await waitFor(async () => (await me(A)).collaboration_prefs.delete_protection === "approve", "A's rule saved", 5000);
        const wall = await area("C40 wall", 0.4);
        const keep = await area("C40 keep", 0.48);
        await signInAt(b.page, APP_B, WINDOW_B.email, WINDOW_B.password);
        await openSheet(b.page, r, APP_B);
        await row(b.page, "C40 wall").locator('[data-protected="ask"]').waitFor({ timeout: 10000 });
        for (const name of ["C40 wall", "C40 keep"]) {
          const at = row(b.page, name);
          await at.hover();
          await at.locator("[data-row-menu]").click();
          await b.page.getByRole("menuitem", { name: /^Delete/ }).first().click();
          const ask = b.page.getByRole("alertdialog").or(b.page.getByRole("dialog")).last();
          await ask.waitFor();
          const words = await ask.innerText();
          expect(words.includes("Marked by") && words.includes("Delete?"), `confirm: ${words}`);
          await ask.getByRole("button", { name: /^Delete$/ }).click();
          await row(b.page, name).locator("[data-delete-requested]").waitFor({ timeout: 10000 });
        }
        await openSheet(page, r);
        await row(page, "C40 wall").locator("[data-delete-requested]").waitFor({ timeout: 10000 });
        await page.locator("[data-notification-bell] > button").click();
        const actions = page.locator("[data-delete-request-actions]");
        await actions.first().waitFor();
        await page.screenshot({ path: shot.replace(".png", "-bell.png") });
        // "C40 keep" denied, "C40 wall" approved, each by its own notice: step 2's request is still open in the bell.
        const answer = (name) => page.locator("li").filter({ hasText: `“${name}”` }).locator("[data-delete-request-actions]");
        await answer("C40 keep").locator("[data-deny]").click();
        await waitFor(async () => (await answer("C40 keep").count()) === 0, "the denied request's buttons to go", 5000);
        await answer("C40 wall").locator("[data-approve]").click();
        await waitFor(async () => (await row(b.page, "C40 wall").count()) === 0, "the approved item gone on B", 8000);
        expect(!(await gone(keep.uuid)), "the denied item went");
        const told = (await apiCall(B, "GET", "/api/notifications")).body.rows.slice(0, 2).map((n) => n.line);
        expect(told.some((l) => l.includes("approved")) && told.some((l) => l.includes("kept")), `B told: ${JSON.stringify(told)}`);
        await reset();
        return `B told: ${told.join(" | ")}`;
      } finally {
        await reset();
        await b.context.close();
      }
    },
  },
  {
    title: "D-789 expiry: a request 8 days old lapses on A's next notice read; the item stays; B is told",
    run: async () => {
      await rule(A, { delete_protection: "approve" });
      const old = await area("C40 old", 0.55);
      const asked = await apiCall(B, "DELETE", `${t}/item/${old.uuid}`);
      expect(asked.body.asked.length === 1, `ask: ${JSON.stringify(asked.body)}`);
      // Backdated on the fx database by the wrapper's psql: the fixture has no clock of its own to move.
      await hostSql(`UPDATE takeoff_delete_request SET created_at = now() - interval '8 days' WHERE targets::text LIKE '%${old.uuid}%'`);
      await apiCall(A, "GET", "/api/notifications");
      const told = (await apiCall(B, "GET", "/api/notifications")).body.rows[0]?.line ?? "";
      expect(told.includes("expired") && !(await gone(old.uuid)), `expiry: "${told}"`);
      await reset();
      return `B told "${told}"; the item stays`;
    },
  },
  {
    title: "D-791: a request past 7 days reads expired before any sweep: the owner's bell shows no buttons and 'expired'; delete-rules lists it no more; the requester's bell says 'Request expired'",
    run: async () => {
      await rule(A, { delete_protection: "approve" });
      const aged = await area("C40 aged", 0.6);
      await apiCall(B, "DELETE", `${t}/item/${aged.uuid}`);
      await hostSql(`UPDATE takeoff_delete_request SET created_at = now() - interval '8 days' WHERE targets::text LIKE '%${aged.uuid}%'`);
      const owner = (await apiCall(A, "GET", "/api/notifications")).body.rows.find((n) => n.kind === "takeoff.delete_request" && n.title.includes("C40 aged"));
      expect(owner && owner.answer_at === null && owner.request_state === "expired", `owner's notice: ${JSON.stringify(owner)}`);
      const rules = (await apiCall(B, "GET", `${t}/delete-rules`)).body;
      expect(!rules.requests.some((q) => q.item_uuid === aged.uuid), "delete-rules still lists the aged request");
      const told = (await apiCall(B, "GET", "/api/notifications")).body.rows.find((n) => n.kind === "takeoff.delete_decided" && n.title.includes("C40 aged"));
      expect(told?.request_state === "expired" && !(await gone(aged.uuid)), `requester: ${JSON.stringify(told)}`);
      await reset();
      return `owner "${owner.request_state}", requester "${told.line}"`;
    },
  },
  {
    title: "D-792: a delete request is mailed to the owner in the invitation's frame (captured in MailHog on the bench)",
    run: async () => {
      await rule(A, { delete_protection: "approve" });
      const mailed = await area("C40 mailed", 0.67);
      await apiCall(B, "DELETE", `${t}/item/${mailed.uuid}`);
      const subject = await waitFor(async () => (await mailTo(world.owner.email, "takeoff_notice")).find((s) => s.includes("asks to delete")), "the request mail", 15000);
      await reset();
      return `mailed: "${subject}"`;
    },
  },
]);
