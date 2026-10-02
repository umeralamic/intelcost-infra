# F15 (part): Community (spec, adopted)

> **Adopted 2026-10-02 (D-234)** from the draft of 2026-10-01, with the founder's answers
> written in: every recommendation accepted (C1 to C17, the draft's Q2 to Q18); Q1 is
> D-180 (one global forum, everything visible to all users).
> - **Sources:** legacy's source on `UmeralamDEV` (`e99cddcb`), its two Community plans
>   (`add-a-fourth-community-section-cool-stuff-2026-08-29`, the latest, and
>   `community-editor-drop-youtube-make-links-universal-2026-08-22`), its migrations.
> - **Live legacy** is read but never posted to: its forum is global, so a post made there
>   is seen by every legacy user.
> - Build to legacy except where an answer below differs. Better options go under Ideas.

## The problem

Estimators have nowhere inside the product to ask how to do something, request a feature,
report a bug or share a win. → Legacy's Community: four boards, rich-text posts with
screenshots and short videos, flat replies, upvotes, an accepted answer on Q&A, a triage
status set by IntelCost staff, the same forum as a tab in takeoff; with the answers'
changes (posting rights, reporting, notices, live updates, paging on the api).

## The answers (D-234)

| # | Topic | Decision |
|---|---|---|
| Q1 | Scope | One global forum (D-180). |
| C1 | Who may post | `canComment`; a viewer reads only. Voting and reporting need it too. |
| C2 | Moderation | IntelCost staff (platform admins, D-23); "Report" on posts and replies reaches staff. |
| C3 | Entry | "Community" in the app header beside Reports; the takeoff tab stays. |
| C4 | Takeoff tab | The same forum, no project context. |
| C5 | Visibility | Private, signed in only. |
| C6 | Identity | Full name, avatar, the "IntelCost" staff badge. |
| C7 | Boards | Q&A, Feature Requests, Bug Reports, Cool Stuff. |
| C8 | Status | Feature Requests and Bug Reports only; Q&A shows "Answered"; Cool Stuff none. |
| C9 | Rich text | B, I, U, S, H1, H2, quote, lists, links, images, MP4. No code, no tables. |
| C10 | Media | Images ≤ 10 MB, MP4 ≤ 100 MB, 1 GB per member counting **live** media; a deleted post's media freed after 30 days. |
| C11 | Delete | Soft for 30 days, restorable by staff; the confirm says so. |
| C12 | Edits | An "edited" marker only. |
| C13 | Old attachments | Not migrated. |
| C14 | Notices | Email and in-app: a reply to your post, your answer accepted, your post's status changed. |
| C15 | Live | New posts and replies appear live, one global topic. |
| C16 | Paging and search | Paged and sorted on the api; search the text, not the markup, debounced. |
| C17 | Votes | Upvotes only; no self-votes. |

## Legacy, as built (what we match)

**Routes and chrome.** `/community` → `/community/qa`; `/community/:section`;
`/community/:section/:postId` (a post under the wrong board moves to its own, `replace`).
Signed out goes to sign-in. Header `container h-16`: the mark, "Intelcost Community"
(`font-display text-lg font-bold`), right "← Back to app" (`text-sm text-muted`). Body
`container grid md:grid-cols-[220px_1fr] gap-6 py-6`; the left column lists the boards
(`rounded-md px-3 py-2 text-sm`, active `bg-primary/10 font-medium text-primary`).

**Boards** (key, slug, icon, status): `qa` "Q&A" HelpCircle, "Ask questions and share
answers with the community."; `feature_requests` "Feature Requests" Lightbulb, "Suggest
what we should build next."; `bug_reports` "Bug Reports" Bug, "Report something broken.
Screenshots welcome."; `cool_stuff` "Cool Stuff" Sparkles, "Interesting finds, industry
news, wins and the occasional laugh."

**Board.** `h1` label (`font-display text-2xl font-bold`), description, "+ New Post".
Controls: "Search posts…" (icon inside), sort (`w-[150px] text-xs`): "Newest activity",
"Top (trending)" (votes ÷ (1 + age days ÷ 30)), "Most replies"; status tabs "All, Open,
Planned, Under Review, In Progress, Completed" (on status boards). Row `rounded-xl border
p-3 hover:border-primary/40`: vote box `w-11` (ChevronUp, count; voted `border-primary
bg-primary/10 text-primary`), title, status badge (none for Open), "✓ Answered"
(emerald), one-line preview (text only), author (24 px avatar, name, "IntelCost" badge),
"3 days ago" from `created_at`, replies count, a media icon; a 96 × 64 thumbnail from `sm`.
Loading "Loading…"; empty "No posts yet. Be the first — click **New Post**."

**Status badges:** Planned blue, Under Review amber, In Progress violet, Completed emerald
(each `-100`/`-800/900`, dark `-900/40`), Open shows none.

**New post** (dialog `sm:max-w-3xl`): title chip "{icon} {board} / New post"; "TITLE"
(`maxLength 200`, "One line that says what this is about"); the editor (min 260 px;
placeholder on Bug Reports "What happened, what you expected, and the steps. Paste a
screenshot straight in (Ctrl+V).", else "Write your post. Paste screenshots, drop images,
or add a video."); footer "Images up to 10 MB · MP4 video up to 100 MB", "Discard",
"Publish post" / "Publishing…". Toasts: "Give it a title of at least 3 characters.", "Add
something to the body first.", "Posted". Discard asks "Discard this post? Anything you've
written or uploaded is lost." when anything was written.

**Editor toolbar:** Bold, Italic, Underline, Strikethrough | Heading 1, Heading 2, Quote |
Numbered list, Bullet list | Link, Image, Video. Link dialog: "Link" (`https://…`), "Text to
show" ("Leave blank to show the link itself"), "Links always open in a new tab.", "Remove
link", "Cancel", "Apply". Image dialog "Add an image": "Click to choose, or drop an image
here", "JPG · PNG · WebP · GIF, up to 10.0 MB", "Frame it with a border", "Insert" /
"Uploading…". Video dialog "Add a video": "Drop an MP4 here, click to browse, or press
Ctrl+V", "MP4 (H.264 video + AAC audio) only, up to 100.0 MB", progress "Uploading… N%",
"Cancel upload". Paste or drop an image anywhere uploads it ("Uploading image…").

**Post.** "← Back to {board}"; card `rounded-xl border p-5`: vote pill, status badge,
staff status select (status boards only, C8), title (`font-display text-xl font-bold`),
author · time · *edited*; the body (`.community-body`: link cards for a bare-URL
paragraph, images open a lightbox). Actions: Edit (author), Delete / "Delete (admin)".
"N Reply/Replies"; replies oldest first, the accepted one first with "✓ Accepted answer"
(emerald border); per reply: vote, author, time, *edited*, "Mark answer"/"Unmark" (Q&A,
post author or staff), edit (author), delete (author or staff). Composer "Reply", "Add
your reply — paste a screenshot if it helps.", "Post reply" / "Posting…". Toasts
"Marked as the answer", "Answer unmarked", "Post deleted", "Status updated", "Title and
body are required".

**Takeoff tab** "Community" after Estimating: board pills in a row, the board or a post
in `max-w-5xl`, kept mounted once visited, no header.

## Changes from legacy (the answers, and fixes of legacy's defects)

- **Posting rights (C1):** writes need `canComment` in at least one of the caller's
  workspaces (the forum is global, so the capability is asked of the person, not a
  workspace); the composer and New Post are hidden for a reader, with "You can read the
  Community; posting needs comment rights in your workspace."
- **The api owns every write (D-03):** title and body only for an author; status for
  staff; counters, the accepted answer and deletion through their own endpoints, so
  nothing can be forged (legacy defects 2, 3, 4).
- **Accepted answer:** must be a live reply of the same post; deleting it clears it.
- **Delete (C11):** soft; the confirm says "Delete this post? It can be restored by
  IntelCost staff for 30 days." Replies, votes and media of a deleted post are frozen
  with it. Staff restore within 30 days; after that a nightly job removes it for good.
- **Status (C8):** only on Feature Requests and Bug Reports; Q&A shows Answered.
- **Votes (C17):** a vote on your own post or reply is refused.
- **Paging (C16):** 25 a page, "Load more"; sort and search on the api; search over
  `body_text` (the body without markup) and the title, debounced 300 ms.
- **Report (C2):** "Report" on posts and replies (a reason, optional); staff see open
  reports on a "Reports" board (staff only) and resolve them.
- **Live (C15):** a `community` topic: new posts, replies, votes and status reach open
  boards and posts.
- **Notices (C14):** in-app (a bell in the app header and the Community header, unread
  count, a list, mark read) and email, for a reply to your post, your answer accepted,
  your post's status changed. Never for your own act.
- **Media (C10):** the quota counts live media; a deleted post's media is freed after 30
  days; unattached uploads are swept after 24 hours (legacy's sweep, which nothing ran).
- **Link cards** are built as elements, never through HTML strings (legacy defect 7).
- **The status filter** resets when the board changes (legacy defect 8).

## Blocks

- **A. The forum.** api `community` feature: `community_post`, `community_reply`,
  `community_vote` (no media yet); list (paged, sorted, searched), read, create, edit,
  soft delete, status, vote, accepted answer, replies; the sanitiser; `canComment`. app:
  the routes and chrome, the board, the post, New Post with the editor (text formatting
  and links), the header link, the takeoff tab.
- **B. Media.** `community_media`, uploads to S3 through the api, the 1 GB quota, image
  and video dialogs, paste and drop, signed reads, posters, the lightbox, link cards; the
  nightly sweep (orphans after 24 h, deleted posts' media after 30 days).
- **C. Live and notices.** The global topic; `notification` rows, the bell, email.
- **D. Moderation.** Report, the staff Reports board, restore within 30 days, the purge.

## Ideas (not built)

- "Share a snapshot" from the canvas into a post (C4 later), once privacy is settled.
- Edit history beyond the marker.
- A digest email instead of one email per notice.

## Progress

- [x] Block A, the forum (api `2572d71`, app `209be0c`)
- [x] Block B, media (api `72db06a`, app `6b71fe9`)
- [ ] Block C, live and notices
- [ ] Block D, moderation
- [x] PARITY §20 rewritten
