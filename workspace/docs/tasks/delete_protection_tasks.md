# F36: Delete protection

**Decision:** [D-789](../../DECISIONS.md). **Board:** MANAGER F36. **Testing:** gates, quantity table, a two-account
smoke; fixture `c40-delete-protection` written for the archived suite, not run (the founder, 2026-10-26).

## Problem → solution

In Work together anyone who can edit takeoff can delete a colleague's measurement by accident. Each person now
says who may delete what they marked: anyone, people they choose, or no one without their approval.

## Steps

1. **Setting:** `delete_protection` (`anyone` · `chosen` · `approve`) and `delete_allowed` (user uuids) on
   `collaboration_prefs`; Settings › Collaboration and the takeoff Settings dialog; member picker for "chosen".
2. **Who may delete what (api `takeoff/protection.py`):** creator of an item / shape, the owner's rule, the
   Owner/Admin override; item and shape reads carry the creator's uuid and name and the viewer's rule
   (`delete_rule`: `yes` · `ask` · `no`).
3. **Enforced on the person's delete routes** (item, bulk, shapes, shape, layer with contents): allowed part
   deleted, protected part kept, outcome returned to the tab (skipped and whose, requests made). System paths
   untouched.
4. **App:** "Marked by <name>. Delete?" before deleting someone else's work (one prompt for a bulk, listing
   whose); a lock on protected rows; the outcome toast.
5. **Delete requests:** `takeoff_delete_request` table; notice with Approve / Deny in the bell; "Delete requested
   by <name>" on the item for everyone; 7-day expiry swept on notice reads; the requester told of each outcome.
