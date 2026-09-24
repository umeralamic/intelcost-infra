"""F3-S2, the stages whose storage does not exist yet.

Overrides (F3-S6) and custom roles (F3-S7) have no table, and the plan is a constant
until F16, so these four rules cannot be reached through a route today. They are driven
here against the real module in the real image — not a test suite, and not a
reimplementation: `capabilities.py` is imported and called.
"""

from app.features.workspace.capabilities import (
    Capability,
    Plan,
    WorkspaceRole,
    apply_plan_mask,
    capabilities_for_role,
    capabilities_from_map,
    resolve,
)

fails = []


def check(name, condition, detail=""):
    print(f"{'PASS' if condition else 'FAIL'}  {name}{(' — ' + detail) if detail else ''}")
    if not condition:
        fails.append(name)


estimator = capabilities_for_role(WorkspaceRole.ESTIMATOR)

# AC2 — a key absent from a saved map falls back to the role default. The saved map
# below mentions one capability; the other 24 were never written, because they did not
# exist when it was saved.
saved = {"canEditPricing": False}
merged = capabilities_from_map(saved, estimator)
check(
    "AC2 absent key falls back to the role default",
    merged["canEditTakeoff"] is True and merged["canRunAi"] is True,
    "canEditTakeoff and canRunAi, absent from the saved map, read as estimator's",
)

# AC3 — an explicit false still wins over the fallback.
check(
    "AC3 explicit false beats the fallback",
    merged["canEditPricing"] is False,
    "estimator grants canEditPricing; the saved map denies it and the denial holds",
)

# AC8 — forbidden capabilities are off whatever the stored map says.
hostile = {cap.value: True for cap in Capability}
check(
    "AC8 forbidden capabilities are stripped from a stored map",
    not any(
        capabilities_from_map(hostile, estimator)[cap.value]
        for cap in (
            Capability.TRANSFER_OWNERSHIP,
            Capability.MANAGE_BILLING,
            Capability.GRANT_OWNER_ROLE,
        )
    ),
    "a map claiming all three reads none of them",
)

# AC4 — the collaborator plan caps everyone, owner included.
owner_on_collab = apply_plan_mask(capabilities_for_role(WorkspaceRole.OWNER), Plan.COLLABORATOR)
check(
    "AC4 the collaborator plan loses measure and keeps markup",
    owner_on_collab["canEditTakeoff"] is False
    and owner_on_collab["canUseAnnotations"] is True
    and owner_on_collab["canComment"] is True
    and owner_on_collab["canUploadDocuments"] is True
    and owner_on_collab["canManageBilling"] is False,
    "an owner on the collaborator plan measures nothing",
)

# And the order: the plan mask is applied AFTER the stored map, so a workspace cannot
# grant itself past its plan by saving an override.
check(
    "AC4 a saved map cannot grant past the plan",
    resolve(
        WorkspaceRole.VIEWER,
        override={"canEditTakeoff": True},
        plan=Plan.COLLABORATOR,
    )["canEditTakeoff"]
    is False,
    "an override granting takeoff on a collaborator plan still reads false",
)

# AC7 — a platform admin is masked by neither.
check(
    "AC7 a platform admin is unmasked by plan and trial",
    resolve(
        WorkspaceRole.ESTIMATOR,
        plan=Plan.COLLABORATOR,
        trial_expired=True,
        is_platform_admin=True,
    )["canEditTakeoff"]
    is True,
    "staff keep the role they hold, whatever the customer's billing says",
)

print(f"\n{6 - len(fails)}/6 passed")
raise SystemExit(1 if fails else 0)
