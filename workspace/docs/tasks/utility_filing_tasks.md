# F43 — Grading Inputs, utilities filed by system, sheet names on per-sheet earthwork items

**Decision:** D-1242. **Repos:** api, app.

## Problem → solution

The Takeoff panel files every utility run and structure under Unclassified, the closed earthwork folder is called
"Earthwork Markups" though it holds the model's inputs, and every sheet's work boundary reads the same. → "Grading
Inputs"; new utility runs and structures file themselves into "Utilities › <system>"; a one-click "File utilities by
system" for those already in Unclassified; per-sheet earthwork items carry their sheet in their name.

## Tasks

1. **Grading Inputs.** The closed folder (`is_earthwork_markup`) is created as "Grading Inputs". Existing projects:
   migration renaming a folder still called exactly "Earthwork Markups" (a renamed one is the user's), written and
   dry-run, **not run** until the founder says yes (it touches every project). App wording "Earthwork Markups" → "Grading
   Inputs" wherever a user reads it.
2. **Utilities by system.** A new utility run (`utility_run`) or structure (`utility_structure`) item is filed at
   creation into the custom folder "Utilities" › <system>, made on first use (a folder the user renamed or moved is
   found by what the app made, not by name; see 5):
   - sanitary, force_main → Sanitary; storm, subdrain → Storm; water → Water; fire_water → Fire; gas → Gas;
     electric, telecom → Dry utilities; other → "Utilities" itself.
   - A structure goes with the run it is attached to (its run's system); unattached, by its own `utility_type`.
   - Only an item with no folder chosen is filed: one created into a folder the user picked stays there.
3. **"File utilities by system"** (Takeoff panel, on Unclassified's right-click and as a banner action when Unclassified
   holds utility items): moves only utility runs and structures that sit in Unclassified (no custom folder) into their
   system folders; says what moved ("Filed 12: Sanitary 7, Storm 5"); one undo step puts them back.
4. **Sheet in the name.** A per-sheet earthwork item made from now on (a work boundary, and any other earthwork input
   made per sheet) is named "<base> – <sheet number, else sheet name>", e.g. "Work Boundary – C12". Existing names are
   not changed.
5. **No fighting the user.** Filing happens once, when an item is made (or when the user asks, 3). An item the user moved
   is never moved back; a system folder the user renamed or moved is still used (found by a stored marker, not its
   name), and one the user deleted is made again only when a new item needs it.

## Proof

Gates; quantity table; smoke on a throwaway: draw a sanitary run and a manhole on it, a storm run, a water valve
unattached → each in its system folder; move one out, draw another → the moved one stays; rename "Sanitary" → the next
sanitary run goes into the renamed folder; put utility items in Unclassified → "File utilities by system" moves only
them, reports counts, undo puts them back; a new work boundary is named with its sheet; the migration's dry-run counts.
