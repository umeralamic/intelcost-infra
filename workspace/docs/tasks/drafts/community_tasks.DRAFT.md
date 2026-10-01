# F15 (part): Community (draft spec, questions open)

> **Draft, written overnight 2026-10-01 (task 7 of the plan).** Nothing is built. The
> founder's answers to the questions at the end come before any code.
> - **Sources:** legacy's source on `UmeralamDEV` (e99cddcb, unchanged for Community since
>   PARITY's build commit), its migrations and plans, and PARITY §20.
> - **Not driven live:** legacy's forum is global, so a post made to look at it would be
>   seen by every legacy user.
> - **PARITY §20** is corrected where the code disagrees.

## The problem

Estimators have nowhere inside the product to ask how to do something, request a feature,
report a bug or share a win. Legacy has a forum for that, both as its own page and as a tab
in takeoff. The new app has none.

**Problem → solution.** No place to talk. → Legacy's Community:
- four boards: Q&A, Feature Requests, Bug Reports and Cool Stuff;
- posts in rich text with pasted screenshots and short videos;
- flat replies, upvotes, and an accepted answer on Q&A;
- a triage status set by IntelCost staff;
- the same forum as a "Community" tab in takeoff.

## Legacy, in brief

- **Routes:**
  - `/community` goes to `/community/qa`; boards live at `/community/:section`, posts at
    `/community/:section/:postId` (a wrong slug corrects itself).
  - Signed in only; signed out goes to `/login`.
  - Its own chrome: "Intelcost Community", "Back to app", the four boards in a left column.
  - Reached only from the landing footer, the takeoff tab and a typed URL. **Nothing links
    to it from the dashboard.**
- **Boards** (label and description):
  - Q&A, "Ask questions and share answers with the community."
  - Feature Requests, "Suggest what we should build next."
  - Bug Reports, "Report something broken. Screenshots welcome."
  - Cool Stuff, "Interesting finds, industry news, wins and the occasional laugh." It
    carries no status.
- **List:**
  - It shows the 200 most recently active posts, with no paging.
  - "New Post" and "Search posts…" (substring match over title and stored HTML, sent on
    every keystroke).
  - Sort: "Newest activity", "Top (trending)" (votes ÷ (1 + age in days ÷ 30)), "Most
    replies".
  - Status tabs (All, Open, Planned, Under Review, In Progress, Completed), shown except on
    Cool Stuff.
  - Each row: an upvote chevron and count, title, status badge (none for Open), "Answered",
    a one-line preview, author (avatar, name, "IntelCost" staff badge), time, replies, and a
    thumbnail of the first image or video poster.
  - Empty: "No posts yet. Be the first — click New Post." It is also shown for no matches
    and for a load error.
- **Post:**
  - The body is rich text (TipTap): bold, italic, underline, strike, H1/H2, quote, lists,
    links ("Link" and "Text to show"; links open in a new tab), and images (JPG, PNG, WebP
    or GIF up to 10 MB, by paste, drop or dialog, optionally bordered, opening a lightbox).
  - MP4 video up to 100 MB, checked in the browser, with a poster frame, progress and
    cancel.
  - The YouTube field was removed (old embeds still render).
  - A paragraph that is only a URL renders as a link card.
- **Replies:** flat, chronological, with the accepted answer first. Each has an upvote,
  "Mark answer" or "Unmark" (Q&A; post author or staff), Edit (author) and Delete (author or
  staff).
- **Staff:** IntelCost platform admins delete anything and set status. Workspace admins
  have no powers.
- **Not present:**
  - notifications, realtime, reporting or flagging, edit history, threads;
  - project or sheet links, and sharing from the canvas.
- **Storage:**
  - Four tables (posts, replies, votes, media) with **no workspace column**: the forum is
    global across all customers.
  - Media sits in a private bucket, with signed links minted at paint time.
  - Each member has a 1 GB media quota.
  - Delete is soft.
- **In takeoff:** the "Community" tab (after Estimating) shows the same forum with no
  project context. It keeps its own section and post in local state (not linkable), and
  stays mounted, hidden, after the first visit.

## Legacy defects found (facts)

1. **Posting rights:** the `canComment` capability ("Comment & post in Community") is
   never checked, so viewers and trial-locked users can post.
2. **Counter tampering:** through the database API, authors can rewrite any column on
   their own post: vote and reply counts, the accepted answer, the section, the deleted
   flag.
3. **Accepted answer:** it has no database check. It can name a reply from another post,
   and it stays "Answered" after that reply is deleted.
4. **Soft delete:** deleting a post leaves its replies, votes and media live. Replies and
   votes can still be added to it.
5. **Quota:** the quota message says to delete old posts to free space, but deleting frees
   nothing, and the orphan sweep is never run.
6. **Media:**
   - Media uploaded while editing is never attached.
   - Images are probably dropped when a post with images is edited (by reading).
7. **Link cards** may allow stored script injection (by reading): the card text is written
   into the page after sanitising.
8. **Board state:** a status filter chosen on one board stays applied, hidden, on Cool
   Stuff, which then shows "No posts yet".
9. **Delete confirm:** it says "cannot be undone", but the delete is soft.
10. **Privacy:** screenshots of one customer's drawings are readable by every other
    customer, which the boards' "paste a screenshot" wording invites.

## PARITY §20 against the code (to rewrite on adoption)

- **Attachments:** there are no file attachments. Bodies carry inline images (≤10 MB) and
  MP4 video (≤100 MB) in the live media bucket; the bug-report attachment is a read-only
  leftover.
- **Votes:** upvotes apply to replies too.
- **Status:** the order is Open, Planned, Under Review, In Progress, Completed, set by
  IntelCost staff only, and absent on Cool Stuff.
- **No line yet for:** editing ("edited"), the author badge, paste or drop, video, the
  lightbox, link cards, the 1 GB quota, the discard confirm, the sorts, the redirects,
  "Back to app", the board descriptions.

## Design proposal (pending the answers)

- **The api owns it (D-03).**
  - A `community` feature: posts, replies, votes and media.
  - Writes only through endpoints that set what a person may set (title and body; status
    for staff), so counters and the answer cannot be forged.
  - Media in S3 under the api's signed links, with quota counted from what was stored.
  - Realtime on a global community topic.
- **Rich text:** sanitised on the api as well as the browser. Link cards are built as
  elements, never as HTML strings.
- **Blocks:**
  - **A.** Boards, list, post, replies, votes, answer, status, soft delete, the takeoff tab.
  - **B.** The editor with images and video, the quota.
  - **C.** Whatever the answers add: notifications, workspace scope, project links.

## Questions for the founder

Each gives legacy's behaviour and my recommendation. None is decided.

**Scope and privacy**
1. **Global or per workspace.** Legacy: one global forum; every customer sees every post,
   name, avatar and screenshot. *Recommend:* keep it global, show only first name and
   initial, and warn on paste that drawings are visible to every IntelCost customer.
2. **Who may post.** Legacy: any signed-in user (`canComment` unchecked). *Recommend:*
   enforce `canComment`, so viewers read only.
3. **Who moderates.** Legacy: IntelCost platform admins only; no report button.
   *Recommend:* keep staff moderation and add "Report" (to staff) on posts and replies.
4. **Where it is reached.** Legacy: the landing footer, the takeoff tab and the URL.
   *Recommend:* add a "Community" link in the app's header beside Reports, and keep the
   takeoff tab.
5. **The takeoff tab's context.** Legacy: the same forum, with no project and no link to a
   sheet. *Recommend:* keep it the same forum; "Share a snapshot" from the canvas comes
   later, once privacy (Q1) is settled.

**Content**
6. **Boards and names.** Legacy: Q&A, Feature Requests, Bug Reports, Cool Stuff (the
   plan's alternatives: Water Cooler, Field Notes, Signal). *Recommend:* keep the four as
   named.
7. **Statuses.** Legacy: Q&A, Feature Requests and Bug Reports carry all five; Cool Stuff
   none; Q&A status and the accepted answer are independent. *Recommend:* status on Feature
   Requests and Bug Reports only; Q&A shows "Answered" instead.
8. **Rich text scope.** Legacy: B/I/U/S, H1/H2, quote, lists, links, images, MP4; no code
   or tables. *Recommend:* keep it.
9. **Media limits and quota.** Legacy: 10 MB images, 100 MB video, 1 GB per member,
   counting deleted posts' media. *Recommend:* keep the limits; count only live media, and
   free a deleted post's media after 30 days (as the Trash).
10. **Deleting.** Legacy: soft, with no restore; the confirm says "cannot be undone".
    *Recommend:* soft for 30 days, restorable by staff, with the confirm saying so.
11. **Edit history.** Legacy: an "edited" flag only. *Recommend:* keep the flag.
12. **Notifications.** Legacy: none. *Recommend:* email and in-app notice on a reply to
    your post, your answer accepted, and your request's status changing.
13. **Realtime.** Legacy: none. *Recommend:* new posts and replies appear live (one topic).
14. **Sorting, paging, search.** Legacy: the newest 200, sorted in the browser; search over
    HTML on every keystroke. *Recommend:* paging on the api, sorts on the api, and search
    on the text (not the markup), debounced.
15. **Votes.** Legacy: upvote only, self-votes allowed. *Recommend:* upvote only, no
    self-votes.
16. **Identity.** Legacy: full name and avatar, and an "IntelCost" staff badge. *Recommend:*
    as Q1, with the staff badge kept.
17. **Legacy's old attachments.** Legacy: a read-only bucket. *Recommend:* migrate nothing
    (F17 decides legacy data).
18. **Public or crawlable.** Legacy: no; signed in only. *Recommend:* keep it private.

## Progress

- [x] Draft written overnight 2026-10-01 from legacy's source and plans.
- [ ] The founder's answers.
- [ ] PARITY §20 rewritten on adoption.
