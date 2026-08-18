"""Admin management of accrual policies.

Alongside CRUD this exposes a coverage check. Tenure bands are stored as
[from, to) — `to` is exclusive — so bands written as "0-24" and "25+" in English
leave month 24 matching nothing, and an employee silently accrues zero that
month. Nothing errors; the entry simply never appears. The check surfaces those
gaps, and any overlap, before anyone loses leave to one.
"""

from decimal import Decimal
from uuid import UUID

from app.errors import ApiError
from app.repositories import (
    accrual_policy_repository,
    leave_type_repository,
    region_repository,
)

_METHODS = {"MONTHLY", "ANNUAL_GRANT", "PER_PAY_PERIOD", "PER_DAYS_WORKED"}


async def list_for_tenant(tenant_id: UUID) -> list[dict]:
    rows = await accrual_policy_repository.find_by_tenant(tenant_id)
    return [dict(r) for r in rows]


def coverage_issues(policies: list[dict]) -> list[dict]:
    """Gaps and overlaps in the tenure bands of each (region, leave type) group.

    A gap means an employee at that tenure matches no policy and accrues
    nothing for those months. An overlap means two policies both apply and the
    winner is decided by priority rather than by intent.
    """
    issues: list[dict] = []
    groups: dict[tuple, list[dict]] = {}
    for p in policies:
        groups.setdefault((p.get("region_id"), p.get("leave_type_id")), []).append(p)

    for (region_id, leave_type_id), group in groups.items():
        bands = sorted(group, key=lambda p: p["tenure_from_months"])
        label = f'{bands[0].get("region_name") or "All regions"} · {bands[0].get("leave_type_name") or "All types"}'

        if bands[0]["tenure_from_months"] > 0:
            issues.append(
                {
                    "kind": "GAP",
                    "scope": label,
                    "message": f'Months 0–{bands[0]["tenure_from_months"] - 1} are not covered by any policy.',
                }
            )

        for a, b in zip(bands, bands[1:]):
            end = a["tenure_to_months"]
            if end is None:
                issues.append(
                    {
                        "kind": "OVERLAP",
                        "scope": label,
                        "message": f'"{a["name"]}" has no upper bound, so it swallows "{b["name"]}".',
                    }
                )
                continue
            start = b["tenure_from_months"]
            if start > end:
                missing = f"{end}" if start == end + 1 else f"{end}–{start - 1}"
                issues.append(
                    {
                        "kind": "GAP",
                        "scope": label,
                        "message": (
                            f'Month {missing} falls between "{a["name"]}" and "{b["name"]}" — '
                            f"an employee at that tenure accrues nothing."
                        ),
                    }
                )
            elif start < end:
                issues.append(
                    {
                        "kind": "OVERLAP",
                        "scope": label,
                        "message": f'"{a["name"]}" and "{b["name"]}" both cover months {start}–{end - 1}.',
                    }
                )
    return issues


async def _validate(tenant_id: UUID, data: dict) -> None:
    if data.get("method") not in _METHODS:
        raise ApiError.bad_request(f"method must be one of {sorted(_METHODS)}")

    if data["method"] == "PER_DAYS_WORKED" and not data.get("days_worked_divisor"):
        raise ApiError.bad_request(
            "PER_DAYS_WORKED needs a divisor — the number of days worked that earns one day of leave"
        )

    to_m = data.get("tenure_to_months")
    if to_m is not None and to_m <= data.get("tenure_from_months", 0):
        raise ApiError.bad_request("The tenure band must end after it starts")

    if data.get("region_id"):
        region = await region_repository.find_by_id(data["region_id"])
        if region is None:
            raise ApiError.bad_request("Unknown regionId")
        if region["tenant_id"] != tenant_id:
            raise ApiError.bad_request("That region belongs to a different tenant")

    if data.get("leave_type_id"):
        if await leave_type_repository.find_by_id(data["leave_type_id"]) is None:
            raise ApiError.bad_request("Unknown leaveTypeId")

    cap = data.get("max_balance")
    carry = data.get("carryover_max")
    if cap is not None and carry is not None and Decimal(carry) > Decimal(cap):
        raise ApiError.bad_request(
            "Carryover cannot exceed the balance cap — the carried days would not fit"
        )


async def create(tenant_id: UUID, data: dict) -> dict:
    await _validate(tenant_id, data)
    return await accrual_policy_repository.insert(tenant_id=tenant_id, **data)


async def update(policy_id: UUID, fields: dict) -> dict:
    existing = await accrual_policy_repository.find_by_id(policy_id)
    if existing is None:
        raise ApiError.not_found("Accrual policy not found")
    merged = {**dict(existing), **fields}
    await _validate(existing["tenant_id"], merged)
    updated = await accrual_policy_repository.update(policy_id, fields)
    assert updated is not None
    return updated


async def delete(policy_id: UUID) -> dict:
    existing = await accrual_policy_repository.find_by_id(policy_id)
    if existing is None:
        raise ApiError.not_found("Accrual policy not found")
    # Ledger entries record the policy name at the time, so history survives.
    # Future accrual for anyone in this band simply stops until it is replaced,
    # which is what the coverage check is there to make visible.
    await accrual_policy_repository.delete(policy_id)
    return {"deleted": existing["name"]}
