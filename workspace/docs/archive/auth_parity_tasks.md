# F2 — Auth and accounts parity

_**The spec.** Every behaviour in [docs/PARITY.md](../PARITY.md) section 1 that is
**partial** or **missing**, as one subtask each, with acceptance criteria that are
checked in a browser on the bench._
_Written: 2026-09-24 · Board row: [MANAGER.md](../../MANAGER.md) F2 · Feature: [FEATURES.md](../../FEATURES.md) P-01_

**Surface:** Auth · **Scope:** `Be` `Fe` · **Owner:** Umer (D-11)

---

## The problem

Section 1 of the parity checklist holds 20 in-scope behaviours, the OAuth consent line
having been retired by D-15. Eight are ported, **three are partial and nine are
missing**. The eight that are ported are the spine — sign in, sign up, forgot password,
reset password, the three invitation paths and the 404 — so the screens exist and the
happy path works. What is absent is everything around the happy path: the redirect
parameters that carry a person from marketing or an inbox to the right place, the
failure states that tell a stuck user *which* thing is broken, the signup-time checks
that keep burner mailboxes out, and the recovery paths for a corrupt session or a
stale bundle.

That is the shape of the gap: **the new auth surface works when nothing goes wrong.**
The twelve subtasks below are the cases where something does, and a thirteenth, F2-S14,
corrects a line the checklist calls ported when it is not.

Legacy is the behaviour reference, not the structure (D-11). Several of these
behaviours were implemented against Supabase primitives that D-03 removed, so the
subtask says what the *user* gets, and the implementation is ours.

---

## Scope boundaries

Three things sit next to this work and are **not** in it.

- **Trial limits and abuse signals are F16; the tier itself is F2.** Legacy's
  `trial-gate` edge function does five jobs: disposable-domain blocking, regional trial
  length, tier resolution, `account_signals` writes (VPN, impossible travel, shared
  fingerprint) and trial-state creation. **Four of the five are in F2** (F2-S5, F2-S8),
  because a tier resolved at signup and never written down is a tier nobody can honour
  later: blocking, trial length, tier resolution, and the assignment that records the
  tier, country, VPN flag and trial window against the new workspace, which is legacy's
  `finalizeTrial`. Only `account_signals` stays out. The resolver must be written once,
  on the api, because legacy's comment is right: the advertised trial length and the
  granted trial length can never be allowed to drift. **F16 enforces what a tier
  allows**; F2 only decides and records it.
- **Live role and permission updates are F3.** Channel 6 in the parity realtime table
  (`user_roles`, `workspace_custom_roles`, `workspace_role_overrides`) is what makes a
  seat change land in an open tab. Accepting an invitation grants a seat, but the
  *other* tab noticing is F3's event, not F2's.
- **The socket itself is F8.** D-13 requires that auth is checked on connect and
  re-checked on refresh, so F8 will hook whatever F2 leaves behind. F2's obligation is
  to leave one place where tokens are cleared, not two.

---

## Realtime events (D-13)

**F2 emits no realtime events.** None of the thirteen legacy channels in
[docs/PARITY.md](../PARITY.md#every-place-legacy-uses-supabase-realtime) is an auth
channel, and no auth behaviour in section 1 needs another browser to be told anything.

One forward dependency is declared here so F8 does not have to rediscover it:

> **There is exactly one place a session is torn down.** D-13 says the JWT is verified
> when the socket opens and re-checked when the token refreshes, so F8 closes the
> socket from that one place. It is `clearTokens()` in `core/auth/tokens.ts`, already
> called by `signOut`, by the `/api/auth/me` rejection path and by both refresh-failure
> paths in `core/api/client.ts`. Two clearing paths is the bug F8 inherits, not a
> tidiness point.
>
> This dependency was originally written against F2-S4, which D-17 has since dropped.
> **Dropping the control did not drop the invariant** — the function was already there
> and F2-S4 would only have added a fourth caller to it. F8 is unaffected.

---

## Subtasks

Each subtask names the parity line it closes, quoted from section 1.

---

### F2-S1 — `?next=` is honoured, and only when it is a same-origin relative path

> _"A `?next=` parameter is honoured only when it is a same-origin relative path, so
> an open redirect is impossible."_ `src/pages/Login.tsx` · **missing**

**Legacy.** One line does the whole job:
`nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null`. The
first test rejects an absolute URL, the second rejects a protocol-relative one
(`//evil.com`, which a browser treats as absolute). Sign-in then uses
`window.location.href = safeNext`. Signup carries the same parameter through, and both
pages propagate it into the link to the other one.

**Today.** `src/pages/Login.tsx` navigates unconditionally to `routes.dashboard` and
never reads the query string. `Signup.tsx` reads `plan`, `cadence` and `seats` but not
`next`. Nothing anywhere redirects to a caller-supplied path, so there is no open
redirect today — this subtask must not introduce one.

**Work.**
- `app`: a `safeNext(raw: string | null): string | null` helper with the two tests
  above, used by `Login` and `Signup`. One home, because it is a security rule and a
  second copy is a second chance to get it wrong.
- `app`: `Login` redirects to `safeNext` after sign-in, else the dashboard. `Signup`
  carries `next` into its link to `/login` and honours it after signup.

**Acceptance criteria.**
1. `/login?next=/settings/account` → sign in as the seeded user → lands on
   `/settings/account`, not `/`.
2. `/login?next=https://example.com/` → sign in → lands on `/`. The address bar never
   shows example.com.
3. `/login?next=//example.com/` → sign in → lands on `/`.
4. `/login?next=/project/<uuid>` for the seeded Riverside project → sign in → the
   project home for that project renders.
5. On `/login?next=/settings/account`, the "Create one" link points at
   `/signup?next=%2Fsettings%2Faccount`.

**Realtime events:** none.

---

### F2-S2 — `?invite=` on sign-in sends the user to the invitation, not the dashboard

> _"A `?invite=` parameter on sign-in sends the user to `/invite/:token` instead of the
> dashboard."_ `src/pages/Login.tsx` · **partial** (the new app has invite signup, not
> invite-aware sign-in)

**Legacy.** `navigate(inviteToken ? '/invite/' + inviteToken : '/app')`. The case is an
invitee who already has an account: they follow the invitation, are told to sign in,
and must land back on the invitation rather than on a dashboard that says nothing
about the workspace they were invited to.

**Today.** `Login` has no `invite` handling at all. `Signup` has full invitation
handling (`useInvitationPreview`, locked email, accept-on-submit), so the
already-has-an-account path is the one that dead-ends.

**Note on the route.** Legacy uses `/invite/:token`; the new app uses
`/accept-invite?token=` (`src/config/routes.ts`). Parity is the behaviour, not the
URL — do not add a second route.

**Work.**
- `app`: `Login` reads `invite`, and on success navigates to
  `routes.acceptInvite + '?token=' + encodeURIComponent(invite)`.
- `app`: `invite` takes precedence over `next` when both are present, matching legacy,
  and the "Create one" link becomes `inviteSignup(token)`.

**Acceptance criteria.**

The subtask exists for an invitee who **already has an account**, so the fixture is an
address that has one. The seeded user cannot play that part: they already own the bench
workspace, so an invitation addressed to them cannot be issued, and signing in as them
against somebody else's token lands on `AcceptInvite`'s "Wrong account" screen — the
right screen, but not the path under test. Register `s2-existing@bench.intelcost.io`
with the bench password first and invite **that** address.

1. Invite `s2-existing@bench.intelcost.io` from `/settings/members` as the seeded user,
   and copy the token from the MailHog message at http://localhost:8025. The body is
   quoted-printable, so the token is split across a soft line break (`=\r\n`) and the
   two halves join with no separator. `GET /api/invitation/<token>` answering
   `account_exists: true` is the check that the fixture is the right one.
2. Open `/login?invite=<token>` and sign in **as `s2-existing`** → lands on
   `/accept-invite?token=<token>`, showing "Join {workspace}" with the inviter, the
   invited address and the role, and a join button. Not the dashboard.
3. On `/login?invite=<token>`, the "Create one" link points at
   `/signup?invite=<token>`.
4. `/login?invite=<token>&next=/settings/account` → sign in → lands on the invitation,
   not on `/settings/account`.
5. `/login?invite=not-a-real-token` → sign in → lands on `/accept-invite?token=…`,
   which shows its existing "not open" state rather than a blank screen.

**Realtime events:** none. The inviter's open members list updating live is F3
(channel 6).

---

### F2-S3 — A network failure is reported differently from a bad password

> _"A network failure is reported differently from a bad password, and names the usual
> cause (ad blocker, privacy extension, stale session)."_ `src/pages/Login.tsx` ·
> **missing**

**Legacy.** `isNetworkError()` matches `failed to fetch|networkerror|load failed|
network request failed` against the error message, and swaps both the title and the
body: "Can't reach the server" plus "This is usually a browser extension (ad-blocker,
privacy, Grammarly) or a cached session…" versus "Sign in failed" plus the server's
own message. This is a real support case — an ad blocker eating the auth request looks
exactly like a wrong password to a user.

**Today.** `Login.tsx` catches and writes
`error instanceof ApiError ? error.message : "Could not reach the server. Try again."`.
The distinction exists but the non-`ApiError` branch says nothing about *why*, and
names no cause. `core/api/client.ts` lets a `fetch` rejection propagate as a raw
`TypeError`, so the two cases are already distinguishable by type — no message-matching
is needed, which is better than legacy's regex.

**Work.**
- `app`: `core/api/client.ts` wraps a `fetch` rejection in a typed `NetworkError` so
  callers test a type rather than a string. `send()` is the only place that calls
  `fetch`, so this is one edit.
- `app`: `Login` and `Signup` render the two-part message for `NetworkError`, naming
  the ad blocker and the privacy extension. **Not the stale session, and no pointer to
  a control:** D-17 dropped F2-S4, so that advice would send a stuck user at a button
  that does not exist.

**Acceptance criteria.**
1. Sign in with the seeded email and a wrong password → the error reads as a
   credentials failure and carries the api's own message. No mention of extensions.
2. `docker compose stop api`, then attempt sign-in → the error reads "Can't reach the
   server", names the ad blocker and the privacy extension as the usual causes, and
   does **not** suggest the password was wrong. `docker compose start api` after.
3. In DevTools set the network to Offline and attempt sign-in → same message as (2).
4. Block the api origin with uBlock Origin (or DevTools request blocking on
   `localhost:8000/api/auth/login`) → same message as (2). This is the case the copy
   exists for.
5. The same two messages appear on `/signup`.

**Realtime events:** none.

---

### ~~F2-S4 — "Clear cached session" unwedges a user with a corrupt token~~ — **DROPPED (D-17)**

> _""Clear cached session" signs out locally, sanitises auth storage and reloads, for a
> user wedged by a corrupt token."_ `src/pages/Login.tsx`,
> `src/integrations/supabase/bootstrap.ts` · **retired** (D-17)

**Not built. Founder decision, logged as [D-17](../../DECISIONS.md).**

The control was a workaround for corrupted Supabase tokens. Legacy could hold
`sb-<project>-auth-token` entries that were unparseable, tokenless, or left behind by
a different Supabase project, and `bootstrap.ts` swept them at module import while the
button was the manual version of the same sweep. **D-03 removed Supabase**, so the
failure mode the control existed for left with the vendor. Shipping the button would
offer a stuck user a fix for a problem the new auth does not have.

The parity line is **retired**, the same treatment D-15 gave the OAuth consent line.

**What survives, and what does not.**

- **The single clearing point survives, because it was never this subtask's to
  build.** `clearTokens()` in `core/auth/tokens.ts` is already called by `signOut`, by
  the `/api/auth/me` rejection path and by both refresh-failure paths in
  `core/api/client.ts`. F2-S4 would have added a fourth caller. **F8 closes the socket
  from that function** (D-13) and is unaffected — see Realtime events above.
- **F2-S3's copy no longer names a stale cached session**, since that advice pointed
  at this control.
- **The shape-validation half survives as F2-S4b, below.** It was briefly `P-17` in
  `FEATURES.md` and has been pulled back into F2. D-17 dropped a button, not a
  defect.

---

### F2-S4b — `getTokens()` validates the token shape, so a bad stored value never sends an empty Bearer

_Not a parity line. The surviving half of the dropped F2-S4, pulled back into F2 from
`FEATURES.md` P-17._

**The defect.** `getTokens()` cast whatever `JSON.parse` returned straight to `Tokens`.
Parsing succeeding says the value is JSON, not that it is a session, so
`{"accessToken":""}` in localStorage came back as a session and `client.ts` built
`Authorization: Bearer ` from it — a header the api rejects on every request, with
nothing on screen to say why. A visitor in that state is wedged, and D-17 removed the
button that would have let them out, so self-healing is not a nicety here: it is the
reason the button is not needed.

**Work.**
- `app`: a shape test in `core/auth/tokens.ts` — both `accessToken` and `refreshToken`
  must be non-empty strings, or the value is not a session.
- `app`: anything malformed is **removed**, not merely ignored, via `clearTokens()`.
  Ignoring it means every later reload re-reads the same broken value.

**Acceptance criteria.**
1. `localStorage.setItem('intelcost.session','{{{')` → reload → the sign-in form
   renders, not a crash, and the key is gone.
2. `{"accessToken":"","refreshToken":"x"}` → reload → treated as signed out, the key
   is gone, and **no request carries `Authorization: Bearer ` with nothing after it**.
3. `{"accessToken":"looks-real-enough"}` (no refresh token) → the same. Half a session
   is not one.
4. A real session is untouched by all of this and survives a reload.
5. A shape-valid but server-invalid access token (`"garbage"`) → the app resolves to
   `/login` or refreshes successfully. It does not sit on a spinner and does not loop.
   This is the case validation *cannot* catch, and it belongs to the 401-refresh path.
6. Signing out removes the key.

**Realtime events:** none.

---

### F2-S5 — Signup refuses disposable and burner mailboxes, and resolves the tier that decides it

> _"Signup is pre-checked against disposable and burner mailboxes and refused with "Use
> a permanent email address"."_ `supabase/functions/trial-gate/`,
> `src/lib/billing/trialGate.ts`, table `disposable_email_domains` · **missing**

**Legacy.** `precheckSignup(email)` runs *before* `auth.signUp`, and it is four
behaviours in one call rather than one. All four port here.

1. **The burner block.** The edge function lowercases the address, takes the domain,
   and looks it up in `disposable_email_domains`.
2. **The tier the block depends on.** `resolveTier(geo)` is the only place a tier is
   derived, and it has three branches. A VPN, proxy, hosting or Tor exit IP forces
   **Tier 3 regardless of the country the IP claims**, because an anonymised address
   makes the apparent country untrustworthy. A known country is looked up in
   `billing_country_tiers`, and a country absent from that table is Tier 3. No VPN and
   no country at all resolves to **Tier 1**, which is what an inert MaxMind
   configuration produces.
3. ~~**The block only bites at Tier 3.**~~ **Superseded by [D-19](../../DECISIONS.md):
   the block bites at every tier.** Legacy ran the check on every signup but refused
   only at Tier 3, so the same `mailinator.com` address was accepted from the United
   States and refused from Nigeria. That makes the answer depend on apparent country,
   which cannot be stated to a customer and is defeated by a VPN into a Tier 1 country.
   The tier still decides the trial length and is still recorded; it no longer decides
   the refusal.
4. **Every layer fails open.** `maxmindLookup` returns inert geo on any error, and
   `precheckSignup` returns `{allowed: true}` both on a function error and in its
   `catch`. A blocklist or geo outage must never block a legitimate signup. The legacy
   source states this twice and it is the single most important property to keep.

Legacy has a fifth step on the other side of the session. `finalizeTrial()` runs once a
session exists and writes the resolved tier, country, VPN flag and trial window against
the new workspace. **That assignment is F2's**, because a tier decided at signup and
never written down is a tier nobody can honour. What reads it afterwards is F16.

**Today.** Nothing. `POST /api/auth/register` accepts any address `EmailStr` allows,
and no tier is resolved or stored anywhere.

**Work.**
- `api`: tables `disposable_email_domains` (domain, primary key), `billing_country_tiers`
  (country_code, tier) and `billing_tier_rules` (tier, trial_days), with Alembic
  migrations. The legacy contents arrive with F17; the bench seed carries a short
  blocklist including `mailinator.com` and `yopmail.com`, Tier 1 = 14 days and
  Tier 3 = 5 days.
- `api`: the tier resolver, written once, in `app/features/auth/`, with the three
  branches above. It is the resolver F2-S8 and F16 both call. Country comes from a
  proxy header when one is set (`cf-ipcountry`, `x-vercel-ip-country`,
  `x-country-code`, `x-geo-country`, `fly-client-country`), else from a MaxMind
  Insights lookup when a key is configured, else nothing.
- `api`: **a recorded divergence from legacy.** Legacy reads the country headers only
  on the trial-length path and always calls MaxMind on precheck. The new resolver
  accepts either source on both paths and reports which one answered. The three branch
  rules are unchanged; only the source order differs, and it is what lets the bench
  drive Tier 3 without a paid key.
- `api`: VPN detection reads MaxMind's `is_anonymous`, `is_anonymous_vpn`,
  `is_public_proxy`, `is_hosting_provider` and `is_tor_exit_node`, as legacy does. With
  no key the flag is false and detection is inert. It is never true by guess.
- `api`: `register` returns `422` with field `email` and the message "Use a permanent
  email address" when the domain is blocked **and** the resolved tier is 3. Any
  internal failure in the domain lookup, the geo call or the tier resolution is
  swallowed and registration proceeds.
- `api`: on successful registration, the resolved tier, country code, VPN flag and the
  trial window taken from `billing_tier_rules` are written against the new workspace.
  This is the `finalizeTrial` equivalent, and it happens inside the same request rather
  than as a second round trip from the browser. **Enforcing what a tier allows is
  F16.** F2 records the assignment so that F16 has something true to enforce.
- `api`: `account_signals` is **not** written here. The abuse-signal table stays in
  F16, per the scope boundary above.
- `app`: `Signup` renders the field-level message against the email input.

**A note on the refusal copy.** The parity line quotes "Use a permanent email address".
The legacy function actually returns "Please sign up with a work email address —
temporary/disposable mailboxes are not accepted." The parity wording is what ships, as
quoted. This is recorded so that the difference is a choice rather than a slip.

**Acceptance criteria.**

The bench has no MaxMind key, so detection is inert and every signup is Tier 1 unless a
country header says otherwise. Drive the tier with the header.

1. **(D-19, was the opposite)** `/signup` with `someone@mailinator.com` and **no**
   country header → **refused**. Inert geo means Tier 1, and Tier 1 blocks now: the
   tier is not what decides this.
2. The same signup with a `cf-ipcountry: NG` header, NG being absent from
   `billing_country_tier` and therefore Tier 3 → refused, the message reads "Use a
   permanent email address", and the error is attached to the email field.
2b. **(D-19)** The same address with `cf-ipcountry: DE`, a listed Tier 2 country →
   **refused**, while `someone@gmail.com` at `DE` is accepted. Same tier, different
   mailbox: the mailbox is the whole rule.
3. The refused address has **no** user row: attempt to sign in with it → a credentials
   failure, not "wrong password" for an existing account. Confirm with
   `docker compose exec postgres psql -U intelcost -d intelcost -c "select count(*) from users where email='someone@mailinator.com'"` → `0`.
4. `/signup` with `someone@gmail.com` and `cf-ipcountry: NG` → accepted. A public
   mailbox is not a disposable one at any tier.
5. Fail-open on the blocklist: rename the table in a psql session
   (`alter table disposable_email_domains rename to tmp_x`), sign up with
   `someone@mailinator.com` and `cf-ipcountry: NG` → **registration succeeds**. Rename
   it back. `docker compose stop postgres` is not this test, because registration needs
   the database.
6. Fail-open on the geo lookup: point the MaxMind base URL at an unroutable host in the
   api environment, restart the api, sign up with `someone@gmail.com` → succeeds, with
   no stall beyond the lookup timeout.
7. Tier assignment: after the Tier 1 signup in (1), psql shows the new workspace's tier
   as 1, a trial window 14 days wide, and the VPN flag false. After a `cf-ipcountry: NG`
   signup with a non-disposable address, tier 3 and a 5-day window.
8. The seeded bench user still signs in unaffected.

**Realtime events:** none.

---

### F2-S6 — Signing up with an existing address routes to sign-in

> _"Signing up with an address that already exists routes to `/login?email=` rather
> than failing opaquely."_ `src/pages/Signup.tsx` · **missing**

**Legacy.** Supabase silently succeeds on a repeat signup and returns a user with an
empty `identities` array, sending no email. Legacy detects that shape, shows "This
email is already registered — sign in with your existing password, or use Forgot
password", and navigates to `/login?email=<address>`.

**Today.** The api is *better* than legacy here: `register` raises
`ConflictError("An account with that email already exists.", field="email")` → HTTP
409 with the field attached. `Signup` catches it and paints the message in the form
error banner, and stops. The user is told, but not moved, and the address they typed
is not carried across.

**Work.**
- `app`: on a 409 from register, navigate to
  `/login?email=<encoded>` (carrying `invite` / `next` if present) and surface the
  "already registered, sign in or reset" message on the login page.
- `app`: `Login` reads `?email=` and prefills the email field.

**Acceptance criteria.**
1. `/signup` with the seeded address `estimator@bench.intelcost.io` → lands on
   `/login?email=estimator%40bench.intelcost.io`.
2. On arrival the email field is prefilled with that address and the password field is
   empty and focused.
3. A message on the login page says the address is already registered and offers both
   signing in and Forgot password, with the Forgot password link working.
4. Typing the seeded password there signs in and reaches the dashboard.
5. `/signup?next=/settings/account` with the seeded address → lands on
   `/login?email=…&next=%2Fsettings%2Faccount`, and signing in reaches
   `/settings/account` (F2-S1 still holds).

**Realtime events:** none.

---

### F2-S7 — A failed signup step leaves no orphaned account

> _"A failed signup step deletes the orphaned auth user so the address stays usable."_
> `supabase/functions/signup-cleanup/` · **missing**

**Legacy.** Signup was two systems: `auth.signUp` created the auth user, and a
trigger/second call created the workspace. When the second half failed, the address was
burned — the auth user existed, so signing up again returned "already registered", but
there was no workspace to sign in to. `signup-cleanup` deletes that auth user, guarded
twice: the caller must be the user being deleted, and the user must own **no**
`user_roles` row.

**Today.** `register` creates the `User` inside one `SessionDep` transaction (see
`service.py` — `session.add(user)` then `flush()`), so a failure in the same
transaction rolls the user back and there is no orphan to clean. **The legacy
mechanism should not be ported.** What must be proven is that the invariant holds,
including across the signup-then-accept-invitation sequence in `Signup.onSubmit`,
which is *two* api calls and therefore two transactions.

**The real gap** is that sequence: `signUp()` succeeds, `accept.mutateAsync(invite)`
then fails, and the invitee holds an account with no seat — legacy's exact failure
shape, moved. That is what this subtask closes.

**Work.**
- `api`: no cleanup endpoint. Instead, confirm and document that register is atomic.
- `app`: when accept-after-signup fails, the user is signed in and must be told
  plainly that the account exists but the invitation did not attach, with a retry that
  re-attempts accept only (never re-registers).
- `api`: accepting an invitation is idempotent for the same user — a second accept of
  a spent-by-me token succeeds rather than 409s, so the retry cannot dead-end.

**Acceptance criteria.**
1. Invite a fresh address, open `/signup?invite=<token>`, and in DevTools block
   requests to the accept endpoint. Submit → the account is created, the screen says
   the seat did not attach, and offers a retry.
2. Unblock, press retry → the seat attaches and the dashboard shows the invited
   workspace. No second account was created.
3. Press retry **again** after success → no error, still one seat, still one account.
4. `select count(*) from "user" where email='<the invited address>'` → `1`.
5. Force a failure inside register itself (stop postgres mid-request, or send a
   payload that violates a constraint) → afterwards, that address can still be signed
   up with normally. No orphan row.

**Built.** No cleanup endpoint, as the analysis said. What changed:

- `api`, `service.register`: a docstring that states the atomicity and names the three
  things that make it true, so the next person to add a step to registration knows
  what they are standing on. No behaviour change.
- `api`, `service.accept_invitation`: already idempotent for the same user from F2-S2.
  The comment now names the retry case, because that is what makes the property
  load-bearing rather than merely tidy.
- `app`, `Signup`: the account existing is now a state the screen holds
  (`accountCreated`), and the authenticated redirect is held off while it does. Before
  this, the session turned authenticated the moment register returned and the dashboard
  replaced the page mid-accept, so an accept that failed had nowhere to report it and
  the seat silently did not exist.
- `app`, `AuthFormError`: a third `action`, `invitation`, so a blocked accept reads as a
  blocked request and not as a made-up reason.

**A sixth criterion, added.** A seat can fail to attach because the request never
landed, or because the invitation stopped being open while the form was being filled
in. Only the first is worth a retry button; the second would hand back the same
sentence however often it is pressed. `ApiError.isClientFault` splits them, and the
closed case says to ask for a new link instead.

**How AC5 was driven.** Stopping postgres takes the api down with it, so the seam was
opened one table wide instead: `alter table auth_token rename to auth_token_hidden`,
which breaks the statement *after* the user row is written and flushed. Register
answered 500, `select count(*) from "user"` for that address was 0, and after renaming
the table back the same address registered (201), signed in (200) and left exactly one
row. The rollback is real, not assumed. Driven from the host, since a container cannot
break its neighbour's database; the sequence is in the header of
`intelcost-infra/browser/f2-s7.mjs`.

**Realtime events:** none.

---

### F2-S8 — The signup page shows the trial length this visitor would actually get

> _"The signup page shows the regional trial length ("14 days free. No card required.")
> resolved from the visitor's billing tier."_ `src/pages/Signup.tsx`,
> `src/hooks/useTrialLength.ts`, table `billing_country_tiers` · **missing**

**Legacy.** `useTrialLength()` calls the `trial-length` action, caches the answer in
`sessionStorage` for the tab, and de-duplicates in-flight calls. The rule that matters
is in both files and is absolute:

> _"If the lookup fails we return null and callers must render copy with NO number —
> never guess a length we might not honour."_

Signup goes further: it shows a number only when the regional lookup and the signup
precheck tier **agree** (`emailTier === null || emailTier === regional.tier`).

Two details of the legacy `trial-length` action port with it. It answers from a free
country header when the platform sets one and **skips the MaxMind call entirely** in
that case, which is a cost decision rather than a fallback. And it returns the VPN flag
alongside the tier, because a VPN-forced Tier 3 is exactly the case where the
advertised length and the granted length would otherwise disagree.

**Today.** `Signup` renders the fixed string "Start your free trial. No card required."
— which is the correct fallback copy, so today's behaviour is safe but never specific.

**Work.**
- `api`: `GET /api/auth/trial-length` → `{tier, trial_days, vpn, source}`, anonymous,
  using the F2-S5 tier resolver and nothing else. `source` names the header that
  answered, or `maxmind`, or `inert`, so a wrong number on the bench is traceable to
  where it came from.
- `api`: a header answer short-circuits the MaxMind call, as legacy.
- `app`: a `useTrialLength` hook with the same sessionStorage cache and in-flight
  de-duplication, and the same never-guess rule: a failed lookup yields null and the
  caller renders copy with no number.
- `app`: `Signup` renders `"{n} days free. No card required."` only when a number is
  known and the precheck tier does not contradict it, else today's copy unchanged.

**Acceptance criteria.**
1. `/signup` on the bench → "14 days free. No card required." Tier 1, because the bench
   resolver is inert.
2. Reload, and in the Network tab the trial-length call fires once per tab, not per
   render. Open a second tab → one more call.
3. `docker compose stop api`, open `/signup` in a fresh tab (clear sessionStorage
   first) → the page still renders and shows "No card required." with **no number**.
   Restart the api.
4. Set the bench Tier 1 rule to 7 days in psql, clear sessionStorage, reload → "7 days
   free".
5. With a `cf-ipcountry: NG` header, so Tier 3 → "5 days free", and the response
   `source` names the header rather than `maxmind`.
6. When the resolver reports `vpn: true`, the page shows the Tier 3 number and never a
   Tier 1 number, which is the advertised-versus-granted rule holding.
7. The invited-signup variant (`?invite=<token>`) shows the workspace subtitle instead,
   and no trial number at all.

**Built.** `GET /api/auth/trial-length` returns `{tier, trial_days, vpn, source}` from
the F2-S5 resolver, which already short-circuited MaxMind on a platform header, so that
half needed nothing. `useTrialLength` caches in `sessionStorage` for the tab and leans
on TanStack Query for in-flight de-duplication; `Signup` renders the number only when
one is known, and only where it has a sentence to put it in.

**The never-guess rule is the whole subtask**, so it is enforced in three places rather
than trusted once: `trial_days` is nullable on the api, the cached value is shape-checked
before it can reach the copy, and the hook returns `null` for "failed" and "not answered
yet" alike so no caller can tell them apart and act clever.

**The precheck agreement clause does not port.** Legacy shows a number only when
`emailTier === null || emailTier === regional.tier`, because it had two resolvers and
they could disagree. There is one here (F2-S5 says so in its first line), so there is
nothing to agree with. The clause is satisfied by construction, not dropped.

**An invited signup does not ask.** AC7 says the invited variant shows no number; the
pass also asserts the call is never made. It is billed per visitor in production and the
page has no sentence to put the answer in.

**How AC4 and AC6 were driven.** Both need the bench changed underneath the api, so both
run from the host and the sequences are in the header of `intelcost-infra/browser/f2-s8.mjs`.
AC4: `update billing_tier_rule set trial_days = 7 where tier = 1` → the page read
"7 days free" → restored to 14. AC6: the MaxMind fake with `FAKE_COUNTRY=US FAKE_VPN=1`
→ the page read "5 days free" with `source: maxmind`, where the same US address without
the VPN flag answers Tier 1 and 14 days. A Tier 1 number there would have meant the VPN
branch never reached the copy.

The fixture reads the api and checks the screen against that answer rather than against a
number written into the script, so the pass fails if the two ever drift. The three
MAXMIND_* variables are now read from the host shell in `docker-compose.yml`, defaulted to
inert, so driving the geo branches no longer means editing the compose file.

**Realtime events:** none. A trial expiring in an open tab is channel 7 → F16.

---

### F2-S9 — The invited signup previews the workspace it joins

> _"Reaching signup with `?invite=` shows "You're joining {workspace}", locks the email
> field, and labels the button "Create account & join {workspace}"."_
> `src/pages/Signup.tsx`, rpc `get_invitation_by_token` · **partial** (the preview is
> built; the button does not name the workspace)

**⚠ The parity status was out of date and has been corrected.** Reading
`intelcost-app-react/src/pages/Signup.tsx` today: `useInvitationPreview(invite)` runs,
the title becomes `Join {workspace_name}`, the subtitle names the inviter and the role,
the email field is `readOnly` and `disabled` with the hint "Fixed by the invitation.",
and a dead invitation gets its own screen rather than degrading to an ordinary signup.
**The preview is built.** One cosmetic difference remains, and one legacy quirk is
deliberately not copied.

**Do not copy this from legacy.** Legacy's `Signup.tsx` opens with a redirect to
`/invite/:token` whenever an invite token is present, so every invited visitor is
bounced to the invite card and **the entire preview block below it is unreachable**.
The comment above it says invited teammates "no longer sign up here". The parity line
therefore describes code that legacy renders only in a state it can no longer reach.
The new app's behaviour, preview in place with no bounce, is the better one and is what
ships.

**Settled.** Keep the new behaviour. The page title already carries the workspace, so
there is no separate "You're joining {workspace}" callout: the heading plus the locked
email field is the preview. The parity line in `docs/PARITY.md` has been rewritten to
describe the behaviour that ships rather than the legacy code path, and it is ticked
when the button label lands.

**Work.**
- `app`: the submit button reads `Create account and join {workspace_name}` rather than
  the bare "Create account and join". That is the whole of the remaining work.

**Acceptance criteria.**
1. Invite a fresh address, open `/signup?invite=<token>` → the heading names the
   workspace, the subtitle names the inviter and the role.
2. The email field holds the invited address, is not editable, and shows "Fixed by the
   invitation."
3. The submit button names the workspace.
4. Submitting creates the account, attaches the seat, and lands on the dashboard with
   that workspace selected.
5. `/signup?invite=garbage` → the "This invitation is not open" screen, with a link to
   sign up without it. No account is created.
6. `/signup` with no parameter → unchanged: "Create your account", editable email,
   "Create account".
7. No redirect to `/invite/:token` happens at any point. The preview stays in place,
   which is the deliberate divergence above.

**Built.** The button reads `Create account and join {workspace_name}`, and that is all
the code this subtask needed. Two things the change turned up, both in the label itself:

- **A name is allowed 255 characters and the button is `whitespace-nowrap` inside a
  384px card.** So the label is two elements: the verb, which never shrinks, and the
  name, which truncates. The longest name in the world still leaves a button that says
  what pressing it does. Driven with a 76-character workspace: the button stays inside
  the form and the verb keeps its width.
- **`gap-2` spaces the two on screen and puts nothing between them in the text.** The
  accessible name came out as "Create account and joinBench Construction", which is what
  a screen reader would have announced. A literal space between the spans fixes it;
  flex drops a whitespace-only child rather than rendering it, so the gap does not
  double. The browser pass reads the label raw rather than whitespace-normalised, which
  is what caught it.

The other six criteria were already true and are asserted as a set, because a preview is
the set and not any one of its parts. AC7 in particular is checked by watching every
navigation the page makes rather than by looking at where it stopped.

**Realtime events:** none.

---

### F2-S10 — A dead reset link says so before the form is filled in

> _"A reset link that never produces a session shows "Link invalid or expired" with a
> path to request a new one."_ `src/pages/ResetPassword.tsx` · **partial** (the new api
> rejects a spent token; the timeout empty state is not built)

**Legacy.** The recovery link put the session in the URL hash, so the page waited for
a `PASSWORD_RECOVERY` event, also checked `getSession()` for the race where the event
fired first, and after **2500ms** with neither gave up and rendered "Link invalid or
expired" with a link to `/forgot-password`.

**Today.** The token is a query parameter, not a hash session, so there is nothing to
wait for and no timeout to build — the parity line's "timeout empty state" is an
artifact of the Supabase transport and should not be ported. `ResetPassword` already
handles a **missing** token with its own screen. What it does not handle is a token
that is present but **spent, expired or forged**: that is only discovered when the api
rejects the submit, after the user has chosen and typed a password twice.

**Work.**
- `api`: `GET /api/auth/password/reset/{token}` → `204` if the token is unspent and
  unexpired, `404` otherwise. It reveals nothing about the account; the token is the
  only thing tested. It does **not** consume the token.
- `app`: `ResetPassword` runs that check before rendering the form, showing a brief
  loading state, then either the form or "Link invalid or expired" with the request-a-
  new-link path.
- `app`: the submit-time rejection keeps its current handling, since a token can be
  spent between the check and the submit.

**Acceptance criteria.**
1. Request a reset for the seeded user, open the link from MailHog → the form renders.
2. Complete the reset, then open the **same** link again → "Link invalid or expired"
   with a working "request a new link" path, and **no password form**.
3. `/reset-password?token=obviously-not-real` → the same dead-link screen, and no
   password form.
4. `/reset-password` with no token at all → the existing "That link is incomplete"
   screen, unchanged.
5. Request two resets in a row and open the **first** link → dead-link screen (the api
   supersedes unspent tokens of the same purpose). The second link works.
6. Open a valid link in two tabs, complete the reset in tab A, then submit in tab B →
   tab B fails gracefully with the same message, not a stack trace.

**Built.** `GET /api/auth/password/reset/{token}` → 204 or 404, reading the token and
never spending it, because the answer is needed *before* the act it describes.
`ResetPassword` asks before it draws the form.

**The submit-time refusal was kept, and step 6 is why.** The check is a courtesy, not
a lock: a link can be spent in another tab between the answer and the submit. Driven
with two real tabs, both of which passed the check because at that moment the link
really was live.

**One trap worth recording.** A 204 has no body, so the api client returns
`undefined`, and a TanStack query function that resolves to `undefined` is an error —
which would have turned every *live* link into the dead-link screen. The hook returns
`true` instead. Caught before the first run, and commented where it would bite again.

**Which kind of dead is deliberately not said.** A spent link, a superseded one, an
expired one and an invented one all get the same sentence, as they do on the submit
path, so holding a dead link tells its holder only that it is dead.

**Realtime events:** none.

---

### F2-S12 — Every page sets its own `document.title`

> _"Every page sets its own `document.title`."_ `src/pages/*.tsx` · **missing**

**Legacy.** Each page sets it in a `useEffect`, and the title tracks state where state
matters: Signup switches between "Start your free trial — Intelcost" and
`Join {workspace} — Intelcost` when the invitation preview lands.

**Today.** `index.html` carries a static `<title>IntelCost</title>`, confirmed in the
running bench. Every route shares it, so browser history, pinned tabs and a window
with six project tabs are all unreadable.

**Scope.** The parity line says *every* page, and section 1 owns the auth pages. The
mechanism is app-wide, so build it once here and let later features use it; this
subtask is only accountable for the auth and error routes.

**Work.**
- `app`: a `useDocumentTitle(title: string)` hook that sets `document.title` to
  `` `${title} — IntelCost` `` and restores nothing (the next route sets its own).
- `app`: applied to `Login`, `Signup` (both states), `ForgotPassword`,
  `ResetPassword`, `VerifyEmail`, `AcceptInvite` and `NotFound`.

**Acceptance criteria.**
1. Each of `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`,
   `/accept-invite` shows a distinct, human tab title ending in "— IntelCost".
2. `/signup?invite=<token>` → the title becomes `Join {workspace} — IntelCost` once the
   preview lands, having read "Create your account — IntelCost" before it.
3. An unknown URL such as `/nope` → a title saying the page was not found.
4. Navigating `/login` → `/signup` → `/forgot-password` by clicking links leaves three
   distinct entries in the browser's history dropdown.

**Built.** `useDocumentTitle` sets `` `${title} — IntelCost` ``, called from
`AuthLayout` and `SettingsLayout` rather than from each page. The heading a layout
already renders **is** the title, and the auth screens have four or five states apiece
— an invitation loading, then dead, then named — so a hook call per state is a list
that drifts from the headings beside it. One call per layout makes the tab and the
page say the same thing by construction.

**The scope was widened by one line of reasoning.** A hook that restores nothing means
a route without one wears the previous route's name: signing in from `/login` would
have left the dashboard titled "Sign in — IntelCost". That is a new wrong title where
there used to be a vague one, so the app-shell pages are titled too. The project and
takeoff screens name the project and the sheet, which is the case the parity line was
written for.

**AC2 reads differently here, and better.** The criterion expects
"Create your account — IntelCost" before the invitation lands. This app shows a
loading screen for the preview, so the title reads "Checking your invitation" first
and then `Join {workspace}`. Two titles, the second naming the workspace, each
matching what is on screen at the time. The browser pass records every assignment
rather than only the final one, which is what makes that visible.

**One bug found and fixed.** The dashboard is both the project list and the onboarding
screen, so the title was `workspace ? "Projects" : "Name your workspace"` — which told
anyone with six workspaces that they had none, for as long as the list took to
arrive. It now waits until it knows.

**Realtime events:** none.

---

### F2-S13 — A stale bundle recovers instead of white-screening

> _"A lazily-loaded route chunk that fails to fetch is retried rather than
> white-screening."_ `src/lib/lazyWithRetry.ts` · **missing**

**Legacy.** Route chunks are content-hashed. After a redeploy, a tab still holding the
previous `index.html` asks for a hash that no longer exists and React Router blanks the
screen. `lazyWithRetry` retries the import once (a transient blip), then calls
`reloadOnceForStaleChunk()`, which uses a `sessionStorage` timestamp and a 15-second
window to guarantee **at most one** hard reload — the guard that stops a reload loop.
`isStaleChunkError` matches the three browser phrasings so an uncaught dynamic-import
rejection can trigger the same recovery.

**Today.** `src/App.tsx` imports all seventeen pages **statically**. There are no route
chunks, so there is no stale-chunk failure to recover from — and also no code
splitting. The parity line cannot be satisfied or falsified as things stand.

**Settled: the small fix.** Port `reloadOnceForStaleChunk` and `isStaleChunkError`
only, wired to a `window.onunhandledrejection` guard. That closes the user-visible
failure, a redeploy white-screening an open tab, without inventing code splitting F2
does not need. The option not taken was to introduce `lazyWithRetry` and split the
seventeen routes: it matches legacy file for file, but D-11 says legacy structure is
not the target, and splitting the bundle is a bundling decision that belongs with the
takeoff workspace rather than with auth. If it is ever wanted it arrives with that
work, and this guard keeps working underneath it.

**Work.**
- `app`: `core/boot/stale-chunk.ts` holding `isStaleChunkError` and
  `reloadOnceForStaleChunk`, with the 15-second one-reload guard and a `try`/`catch`
  around `sessionStorage` (a private window refuses it, and the reload must still
  happen).
- `app`: a global `unhandledrejection` listener in `main.tsx` that calls it.

**Acceptance criteria.**
1. With the bench running, in the DevTools console:
   `window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {promise: Promise.reject(new Error('Failed to fetch dynamically imported module: /assets/x.js')), reason: new Error('Failed to fetch dynamically imported module: /assets/x.js')}))`
   → the page reloads exactly once.
2. Fire the same event again within 15 seconds → **no** second reload. Confirm
   `sessionStorage` holds the guard key.
3. Fire it again after 15 seconds → reloads once more.
4. Fire an unrelated rejection (`new Error('boom')`) → no reload.
5. Repeat (1) in a private window with storage blocked → still exactly one reload, no
   uncaught exception in the console.

**Built.** `core/boot/stale-chunk.ts` and one `unhandledrejection` listener installed
before the first render, because a module that will not load takes the tree down with
it and nothing inside the tree gets a chance to listen.

**AC5 turned out to be a hole in the design, not just a test.** A reload wipes memory,
so an in-memory fallback cannot guard the reload it is guarding — with storage refused,
a genuinely missing asset reloads, finds the asset still missing, and reloads again,
for ever. Legacy has that hole. The timestamp now travels in the URL when storage
refuses (`?_icr=<ms>`, adopted and stripped at boot with `replaceState`, so nothing is
left in the address bar), which is the one carrier that survives a navigation without
anyone's permission. A tab that reloads forever is worse than the white screen this
exists to fix.

The browser pass catches its own noise: constructing a `PromiseRejectionEvent` with a
live rejected promise produces a second, genuine unhandled rejection, and a step that
cannot tell one reload from two is measuring itself. AC3 ages the stored timestamp
rather than idling for fifteen seconds of real time.

**Realtime events:** none.

---

### F2-S14 — Job title is collected at signup _(correction: the parity line reads **ported**)_

> _"Sign up with full name, email, password and optional job title."_
> `src/pages/Signup.tsx` · **ported**

**This line is marked ported and is not.** Included because it sits inside F2's
surface and would otherwise be ticked on the bench without anyone noticing the field is
absent. Drop this subtask if the correction should be handled separately.

**Evidence.** `app/features/auth/schemas.py` has `job_title` on `UserBase`, so
`UserCreate` accepts it and `service.py` persists it (`job_title=payload.job_title`).
But `intelcost-app-react/src/pages/Signup.tsx` has no job-title field, and
`session.tsx:97` sends only `{ email, password, full_name }`. The column is written by
nothing at signup. The seeded bench user has a job title only because
`scripts/seed.py` posts one directly.

**Work.**
- `app`: an optional "Job title" input on `Signup`, placeholder "e.g. Estimator, PM,
  GC", max length 100, matching legacy.
- `app`: `signUp()` takes and forwards `job_title`.

**Acceptance criteria.**
1. `/signup` shows an optional job title field, labelled optional.
2. Signing up with "Senior Estimator" → `/settings/account` shows it.
3. Signing up with it left blank → succeeds, and the account screen shows no job title
   rather than an empty string. Confirm the column is `NULL` in psql.
4. The invited signup variant shows the same field.

**Built.** An optional field on `Signup`, forwarded by `signUp()`. Blank is omitted
from the request rather than sent as `""`, so the column stays NULL: an empty string
and no answer look identical on screen and behave differently everywhere that asks
"did they tell us". Confirmed in psql, since the browser cannot see the difference.

**AC2 needed one thing the Work list did not mention.** `/settings/account` showed the
address and the password and nothing else, so there was nowhere for a job title to
appear. It now opens with the person's name and, when there is one, their title.

**The subtask's real value is the correction.** The parity line read **ported**. The
api has accepted `job_title` since the first migration and `register` persists it;
nothing ever sent one, so the column was written by `scripts/seed.py` and by nothing
else. A bench walk-through would have shown a job title on the seeded user and ticked
the line.

**Realtime events:** none.

---

## Corrections to PARITY section 1

Applied to [docs/PARITY.md](../PARITY.md) as part of F2, so the checklist stops
disagreeing with the code:

| Line | Reads | Should read | Why |
|---|---|---|---|
| Invited signup preview | **partial** (no preview) | **partial** (preview built, button label outstanding), and the line rewritten to describe the behaviour that ships | `useInvitationPreview` builds the preview, locks the email and names the workspace. Legacy's own redirect makes its version unreachable. Applied. See F2-S9. |
| Optional job title | **ported** | **partial** | The api accepts it; no form field sends it. See F2-S14. |
| Reset-link timeout state | **partial** (timeout empty state) | **partial** (no pre-submit token check) | The timeout was a Supabase-hash artifact. The real gap is different. See F2-S10. |
| OAuth consent | **missing** | **retired** (D-15), struck from the in-scope count | A Lovable platform artifact, not a product feature. Applied. See D-15. |
| Clear cached session | **missing** | **retired** (D-17), struck from the in-scope count | A workaround for corrupted Supabase tokens, which D-03 removed. Applied. See D-17. |

Section 1 holds **19 in-scope behaviours** after D-15 retired the OAuth line and D-17
retired the "Clear cached session" line.

---

## Definition of done

- F2-S1, F2-S2, F2-S3, F2-S4b, F2-S5 … F2-S10, F2-S12, F2-S13 and F2-S14 are driven
  on the bench against their acceptance criteria, in a real browser, including the
  failure states. Two subtasks are not built: **F2-S4** (D-17) and **F2-S11** (D-15).
- The corrections above are applied to `docs/PARITY.md`, and every section 1 line that
  now holds is ticked.
- `cd intelcost-app-fastapi && poetry run ruff check . && poetry run mypy app` passes.
- `cd intelcost-app-react && npm run lint && npm run typecheck && npm run build` passes.
- The spec moves to `docs/archive/`, the F2 row leaves `MANAGER.md`, and the feature
  moves to the `FEATURES.md` ✅ Live table.

## Settled questions

1. **Third-party OAuth and MCP.** Settled by **D-15**: `/.lovable/oauth/consent` is a
   Lovable platform artifact, not a product feature, and is not ported. F2-S11 is
   dropped and the parity line is retired rather than left missing.
2. **F2-S13, the small fix or the split bundle.** Settled: the small fix. Recorded in
   the subtask.
3. **F2-S9, the callout.** Settled: the title carries it, no separate callout. The
   button label is the only work left.
4. **Password length.** Legacy accepts 8 characters, the new api requires 10
   (`schemas.py`, with the comment "Estimators share machines on site"). This is a
   deliberate improvement, not a parity gap. The consequence lands on F17, whose
   `MANAGER.md` row now carries it: legacy passwords are Supabase bcrypt, so login
   verifies bcrypt and rehashes to Argon2, and the length rule applies on set and
   change only, never on login. Without that, every migrated user is forced through a
   reset.

---

## What F2-S5 could not be tested against on the bench

Recorded because "it passed on the bench" means less if it is not said what the bench
could not reach.

| Behaviour | Why the bench cannot reach it | What stood in |
|---|---|---|
| A **real MaxMind Insights lookup** | No account and no licence key, and buying one to run a bench is not justified. With no key the client does not call out at all and the resolver is inert by design. | `intelcost-infra/fakes/maxmind/`, a stand-in that answers `/geoip/v2.1/insights/<ip>` with a body shaped like the real one. What it claims is set per-run: `FAKE_COUNTRY`, `FAKE_VPN`, `FAKE_STATUS`, `FAKE_BODY`. It fills only the fields `tier.py` reads. |
| **VPN forcing Tier 3** (branch 1) | Needs the provider to say an address is anonymised, which only the provider can say. | The fake, set to `FAKE_COUNTRY=US FAKE_VPN=1`. US is a **Tier 1** country in the bench data, so the result is only Tier 3 if the VPN flag genuinely overrides a known country. Driven: tier 3, country recorded as US, `vpn=true`, 5-day window, and a blocked domain behind it refused, where the same domain from US without the VPN is accepted. |
| **Geo provider outage** | The real endpoint does not fail on request. | Two fakes. `FAKE_STATUS=503` for a provider having a bad day, and `MAXMIND_BASE_URL` pointed at an unroutable host for a timeout. Both resolved Tier 1 with a 14-day trial in ~2.7s, bounded by `maxmind_timeout_seconds`. |
| **A malformed provider response** | Same. | `FAKE_BODY=garbage` returns a 200 that is not the expected shape. Resolved Tier 1, no country, `vpn=false`. **Never true by guess** is the property being checked. |
| ~~The real `billing_country_tier` and `disposable_email_domain` contents~~ | **No longer a gap.** The real data was read out of the legacy `public` schema and now ships in migration `b17d4e90c3a2`, so every environment resolves identically. The bench-only seed script is retired. | — |
| ~~Tier 2 anything~~ | **No longer a gap.** Tier 2 is 7 days, with 23 countries. Driven on the bench: `cf-ipcountry: DE` → tier 2, 7-day window. | — |
| **A real proxy setting the country header** | No Cloudflare, Vercel or Fly in front of the bench. | The header is sent directly, which is the same thing the resolver sees in production. In the browser pass it is injected onto api requests only, because adding it to every request breaks Google Fonts' CORS preflight and fills the console with unrelated failures. |

**What this leaves genuinely unproven.** That MaxMind's live response shape matches what
`_read_insights` reads. The field names are taken from the legacy source
(`is_anonymous`, `is_anonymous_vpn`, `is_public_proxy`, `is_hosting_provider`,
`is_tor_exit_node`, `country.iso_code`) and the fake mirrors them, so a fake agreeing
with the reader proves the reader is self-consistent, not that it is right. First
contact with a real key should be checked by hand. The blast radius is small and in the
safe direction: an unread field means the flag stays false, which fails open.
