// C20, the founder's click check of the Forum (F15 Community, D-234): a post with an image and a
// video, a reply, votes, an accepted answer, the bell, Report, and the staff board's Remove and
// Restore.
//
//   ./browser/c20-forum.sh      (two passes with one database step between; see that file)
//
// The people, all throwaway: the run's owner (A) posts in Q&A; REPLIER (B), seated in A's
// workspace, replies, upvotes A's post, is told by the bell that A marked the reply as the answer,
// and reports the post; STAFF, a seat made platform staff in the database step, sees the report on
// the bell and the Reports board, removes the post and restores it from Recently deleted.
//
// The video is made in the run's own browser (a canvas recorded to MP4 by MediaRecorder), since no
// MP4 sits in the repos; if this browser cannot record MP4 the step says so. Left for the
// founder's eye: how the image and video look in the post and on the board, the editor's feel,
// live updates between two windows, and the wording of each notification.

import { APP, apiCall, apiLogin, createWorkspace, expect, fixtureOwner, run, seatedMember, signInAs } from "./lib/bench.mjs";
import { makePng } from "./lib/drawings.mjs";
import { waitFor } from "./lib/realtime.mjs";

const PASSWORD = "bench-password-1";

if (process.env.SETUP === "1") {
  const owner = await fixtureOwner();
  const workspace = await createWorkspace(owner.token, `C20 Forum ${Date.now()}`);
  const replier = await seatedMember(owner.token, workspace.uuid, "estimator", "c20-replier");
  const staff = await seatedMember(owner.token, workspace.uuid, "viewer", "c20-staff");
  console.log(`OWNER=${owner.email}`);
  console.log(`REPLIER=${replier.email}`);
  console.log(`STAFF=${staff.email}`);
  process.exit(0);
}

for (const key of ["FX_OWNER", "REPLIER", "STAFF"]) {
  if (!process.env[key]) {
    console.error(`Run the SETUP pass first; ${key} is missing. See c20-forum.sh.`);
    process.exit(2);
  }
}
const owner = await fixtureOwner();
const A = { email: process.env.FX_OWNER, token: owner.token ?? (await apiLogin(process.env.FX_OWNER, PASSWORD)) };
const B = { email: process.env.REPLIER, token: await apiLogin(process.env.REPLIER, PASSWORD) };
const S = { email: process.env.STAFF, token: await apiLogin(process.env.STAFF, PASSWORD) };
const TITLE = `C20 how do I count fixtures ${Date.now()}`;
const post = {};

/** A second person's page in its own context, signed in. */
async function as(context, who) {
  const other = await context.browser().newContext({ viewport: { width: 1440, height: 900 } });
  const page = await other.newPage();
  await signInAs(page, who.email);
  return { page, close: () => other.close() };
}
const readPost = async (token) => apiCall(token, "GET", `/api/community/posts/${post.uuid}`);

/** The bell: its unread label, then the menu's notices by kind. */
async function bell(page) {
  const box = page.locator("[data-notification-bell]").first();
  await box.waitFor({ timeout: 20000 });
  const label = (await box.locator("button").first().getAttribute("aria-label")) ?? "";
  await box.locator("button").first().click();
  const menu = page.getByRole("menu", { name: "Notifications" });
  await menu.waitFor();
  const kinds = await menu.locator("[data-notice]").evaluateAll((els) => els.map((e) => `${e.dataset.notice}: ${(e.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80)}`));
  await page.keyboard.press("Escape");
  return { label, kinds };
}

await run("c20-forum", [
  {
    title: "post: A's New Post in Q&A with a PNG image and an MP4 video, published; the post shows both and the api holds two media",
    run: async ({ page }) => {
      await signInAs(page, A.email);
      await page.goto(`${APP}/forum/qa`);
      await page.getByRole("button", { name: "New Post" }).click();
      const dialog = page.getByRole("dialog").filter({ hasText: "New post" });
      await dialog.waitFor();
      await dialog.getByPlaceholder("One line that says what this is about").fill(TITLE);
      const body = dialog.getByLabel("Post body", { exact: true });
      await body.click();
      await page.keyboard.type("Is there a way to count every light fixture across the set? Picture and clip below.");

      await dialog.getByRole("toolbar", { name: "Post body formatting" }).getByRole("button", { name: "Image", exact: true }).click();
      const imageDialog = page.getByRole("dialog", { name: "Add an image" });
      await imageDialog.waitFor();
      await imageDialog.locator("input[type=file]").setInputFiles({ name: "fixture.png", mimeType: "image/png", buffer: makePng(160, 120) });
      await imageDialog.getByRole("button", { name: "Insert", exact: true }).click();
      await imageDialog.waitFor({ state: "detached", timeout: 30000 });
      await body.locator("img").first().waitFor({ timeout: 15000 });

      const made = await page.evaluate(async () => {
        const types = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4;codecs=vp9", "video/mp4;codecs=av01", "video/mp4"];
        const type = types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
        if (!type) return { error: "this browser's MediaRecorder records no MP4" };
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        const g = canvas.getContext("2d");
        const recorder = new MediaRecorder(canvas.captureStream(15), { mimeType: type });
        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        let frame = 0;
        const draw = setInterval(() => {
          g.fillStyle = `hsl(${(frame * 25) % 360}, 70%, 50%)`;
          g.fillRect(0, 0, 320, 240);
          frame += 1;
        }, 66);
        const stopped = new Promise((r) => (recorder.onstop = r));
        recorder.start(250);
        await new Promise((r) => setTimeout(r, 1500));
        recorder.stop();
        await stopped;
        clearInterval(draw);
        const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
        let s = "";
        for (const b of bytes) s += String.fromCharCode(b);
        return { type, b64: btoa(s) };
      });
      // The video: a failure here is kept and reported at the end of the step, so the post is
      // still published and the steps after it still run.
      let videoFailed = made.error ?? null;
      const video = made.b64 ? Buffer.from(made.b64, "base64") : Buffer.alloc(0);
      if (!videoFailed) {
        await dialog.getByRole("toolbar", { name: "Post body formatting" }).getByRole("button", { name: "Video", exact: true }).click();
        const videoDialog = page.getByRole("dialog", { name: "Add a video" });
        await videoDialog.waitFor();
        await videoDialog.locator("input[type=file]").setInputFiles({ name: "clip.mp4", mimeType: "video/mp4", buffer: video });
        // A refusal is a toast that lasts seconds: caught as it shows.
        const toast = page.locator("[data-sonner-toast]").last().textContent({ timeout: 30000 }).catch(() => null);
        await videoDialog.getByRole("button", { name: "Insert", exact: true }).click();
        await videoDialog.waitFor({ state: "detached", timeout: 60000 }).catch(async () => {
          videoFailed = `the video (${video.length} bytes, ${made.type}) was not inserted; the page said: ${(await toast)?.trim() || "nothing"}`;
          await videoDialog.getByRole("button", { name: /^Cancel/ }).click().catch(() => undefined);
        });
        if (!videoFailed) await body.locator("video").first().waitFor({ timeout: 15000 });
      }

      const [created] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith("/api/community/posts") && r.request().method() === "POST", { timeout: 30000 }),
        dialog.getByRole("button", { name: "Publish post" }).click(),
      ]);
      expect(created.status() === 201, `publish: ${created.status()} ${await created.text()}`);
      Object.assign(post, await created.json());
      const view = page.locator(`[data-community-post="${TITLE}"]`);
      await view.waitFor({ timeout: 20000 });
      await view.locator("img").first().waitFor({ timeout: 15000 });
      const read = (await readPost(A.token)).body;
      const media = Array.isArray(read.media) ? read.media.length : Object.keys(read.media ?? {}).length;
      expect(!videoFailed, `posted with the image only (${media} media): ${videoFailed}`);
      await view.locator("video").first().waitFor({ timeout: 15000 });
      expect(media >= 2, `media on the post: ${JSON.stringify(read.media)}`);
      return `"${TITLE}" in Q&A; image 160 × 120 PNG, video ${video.length} bytes (${made.type}); ${media} media`;
    },
  },
  {
    title: "reply and votes: B upvotes A's post and replies; A upvotes B's reply; A cannot upvote A's own post",
    run: async ({ page, context }) => {
      const b = await as(context, B);
      try {
        await b.page.goto(`${APP}/forum/qa/${post.uuid}`);
        const view = b.page.locator(`[data-community-post="${TITLE}"]`);
        await view.waitFor({ timeout: 20000 });
        await view.getByRole("button", { name: "Upvote" }).first().click();
        await view.getByRole("button", { name: "Remove upvote" }).first().waitFor({ timeout: 10000 });
        await b.page.getByLabel("Reply", { exact: true }).click();
        await b.page.keyboard.type("Yes: the Count tool's search finds a symbol across every sheet.");
        await b.page.getByRole("button", { name: "Post reply" }).click();
        await b.page.locator("li[data-reply]").first().waitFor({ timeout: 15000 });
      } finally {
        await b.close();
      }
      await signInAs(page, A.email);
      await page.goto(`${APP}/forum/qa/${post.uuid}`);
      const reply = page.locator("li[data-reply]").first();
      await reply.waitFor({ timeout: 20000 });
      const own = page.locator(`[data-community-post="${TITLE}"]`).getByRole("button", { name: /^(Upvote|Remove upvote)$/ }).first();
      expect(await own.isDisabled(), "A may upvote A's own post");
      await reply.getByRole("button", { name: "Upvote" }).click();
      await reply.getByRole("button", { name: "Remove upvote" }).waitFor({ timeout: 10000 });
      const read = (await readPost(A.token)).body;
      const replies = read.replies ?? [];
      expect(read.upvote_count === 1 && replies.length === 1 && replies[0].upvote_count === 1, `api: post ${read.upvote_count} votes, replies ${JSON.stringify(replies.map((r) => r.upvote_count))}`);
      post.reply = replies[0].uuid;
      return `post 1 upvote (B's), 1 reply with 1 upvote (A's); A's own upvote disabled`;
    },
  },
  {
    title: "answer and bell: A marks B's reply as the answer; A's bell has the reply, B's bell has the answer",
    run: async ({ page, context }) => {
      await signInAs(page, A.email);
      await page.goto(`${APP}/forum/qa/${post.uuid}`);
      const reply = page.locator("li[data-reply]").first();
      await reply.waitFor({ timeout: 20000 });
      await reply.getByRole("button", { name: "Mark answer" }).click();
      await reply.getByRole("button", { name: "Unmark" }).waitFor({ timeout: 10000 });
      const read = (await readPost(A.token)).body;
      expect(read.answered_reply_uuid === post.reply, `answered ${read.answered_reply_uuid}, reply ${post.reply}`);
      const aBell = await bell(page);
      expect(aBell.kinds.some((k) => k.startsWith("community.reply")), `A's bell: ${aBell.label}; ${aBell.kinds.join(" | ")}`);
      const b = await as(context, B);
      try {
        await b.page.goto(`${APP}/forum/qa`);
        let bBell;
        await waitFor(async () => {
          bBell = await bell(b.page);
          return bBell.kinds.some((k) => k.startsWith("community.answer")) ? true : null;
        }, "B's answer notice", 15000).catch(() => {
          throw new Error(`B's bell: ${bBell?.label}; ${bBell?.kinds.join(" | ")}`);
        });
        return `marked; A's bell "${aBell.label}" (${aBell.kinds.length}); B's bell "${bBell.label}": ${bBell.kinds.find((k) => k.startsWith("community.answer"))}`;
      } finally {
        await b.close();
      }
    },
  },
  {
    title: "Report: B reports A's post with a reason; the staff bell has the report",
    run: async ({ context }) => {
      const b = await as(context, B);
      try {
        await b.page.goto(`${APP}/forum/qa/${post.uuid}`);
        const view = b.page.locator(`[data-community-post="${TITLE}"]`);
        await view.waitFor({ timeout: 20000 });
        await view.getByRole("button", { name: "Report", exact: true }).click();
        const dialog = b.page.getByRole("dialog", { name: "Report this post" });
        await dialog.waitFor();
        const reason = dialog.locator("textarea, input[type=text]").first();
        if (await reason.isVisible().catch(() => false)) await reason.fill("Fixture: please check this one.");
        await dialog.getByRole("button", { name: "Report", exact: true }).click();
        await b.page.getByText("Reported to IntelCost staff").first().waitFor({ timeout: 10000 });
      } finally {
        await b.close();
      }
      const s = await as(context, S);
      try {
        await s.page.goto(`${APP}/forum/qa`);
        let sBell;
        await waitFor(async () => {
          sBell = await bell(s.page);
          return sBell.kinds.some((k) => k.startsWith("community.report")) ? true : null;
        }, "the staff's report notice", 15000).catch(() => {
          throw new Error(`staff bell: ${sBell?.label}; ${sBell?.kinds.join(" | ")}`);
        });
        return `reported; staff bell "${sBell.label}": ${sBell.kinds.find((k) => k.startsWith("community.report"))}`;
      } finally {
        await s.close();
      }
    },
  },
  {
    title: "staff board: Reports lists the post; Remove deletes it (A's api read 404s); Recently deleted's Restore brings it back with its reply and answer",
    run: async ({ context }) => {
      const s = await as(context, S);
      try {
        await s.page.goto(`${APP}/forum/reports`);
        const board = s.page.locator("[data-staff-reports]");
        await board.waitFor({ timeout: 20000 });
        const report = board.locator(`li[data-report="${TITLE}"]`);
        await report.waitFor({ timeout: 15000 });
        await report.getByRole("button", { name: "Remove" }).click();
        // The toasts by their exact words: "already removed" on the board would match a substring.
        await s.page.locator("[data-sonner-toast]").filter({ hasText: /^Removed$/ }).first().waitFor({ timeout: 10000 });
        await waitFor(async () => ((await readPost(A.token)).status === 404 ? true : null), "the post removed", 10000).catch(async () => {
          throw new Error(`after Remove, A reads ${(await readPost(A.token)).status}`);
        });
        const deleted = board.locator(`li[data-deleted-post="${TITLE}"]`);
        await deleted.waitFor({ timeout: 15000 });
        const [restored] = await Promise.all([
          s.page.waitForResponse((r) => /\/staff\/posts\/[0-9a-f-]+\/restore$/.test(r.url()), { timeout: 15000 }),
          deleted.getByRole("button", { name: "Restore" }).click(),
        ]);
        expect(restored.status() === 200, `restore: ${restored.status()} ${await restored.text()}; for post ${post.uuid}, called ${restored.url()}`);
        await s.page.locator("[data-sonner-toast]").filter({ hasText: /^Restored$/ }).first().waitFor({ timeout: 10000 });
      } finally {
        await s.close();
      }
      let back;
      await waitFor(async () => {
        back = await readPost(A.token);
        return back.status === 200 ? true : null;
      }, "the post readable again", 10000).catch(() => undefined);
      expect(back.status === 200 && (back.body.replies ?? []).length === 1 && back.body.answered_reply_uuid === post.reply, `after Restore: ${back.status} ${JSON.stringify(back.body).slice(0, 300)}`);
      const board = await apiCall(A.token, "GET", `/api/community/posts?section=qa`);
      const listed = JSON.stringify(board.body).includes(post.uuid);
      expect(listed, `not on the Q&A board after Restore: ${JSON.stringify(board.body).slice(0, 300)}`);
      return "removed (404 for A), restored: the post, its reply and its answer are back on the board";
    },
  },
]);
