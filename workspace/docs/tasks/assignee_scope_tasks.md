# F37: A scope per assignee

**Decision:** [D-790](../../DECISIONS.md). **Board:** MANAGER F37. **Testing:** gates, quantity table, a two-account
smoke; fixture `c41-assignee-scope` written for the archived suite, not run (the founder, 2026-10-26).

## Problem → solution

Assigned To says who, never what. Each assignee may now carry a scope (classification nodes, scope values, custom
folders, and a note); the person sees it on the dashboard and can filter the takeoff and the estimate to it.

## Steps

1. **Data:** `project_assignee_scope` (classification node · scope name · custom folder) and
   `project_assignee.note`; the assignee save takes `[{user_uuid, scopes, note}]` and still a plain uuid list;
   project reads carry `assignees` with their scopes.
2. **Editing:** Edit Project › Assigned To and Share › Project Users: chips per person, "+ Scope" picker (three
   tabs and a note).
3. **Seeing:** "Your scope: …" on the dashboard row; "Assigned to me" in the Quantities panel (Folders and
   Classification views) and in Estimating's filters.
4. **Notices:** given, changed or removed scope → a notice to the person.
