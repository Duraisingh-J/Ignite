"""Notifications: leave events out to Slack, email, or the log.

The rest of the application imports only the event functions below. It never
sees a channel, a template or an address, so swapping delivery mechanisms
touches nothing outside this package.

    from app import notifications
    await notifications.leave_submitted(request_id)

Design notes worth knowing before changing anything here:

  * Recipients come from the FROZEN APPROVAL CHAIN, never from
    employee.manager_id. A request whose tier 1 is unreachable routes to
    tier 2, and the person who must act is the person who should be told.

  * Nothing raises. A notification is a side effect of an action, never a
    precondition for it.

  * Nothing blocks. Delivery is scheduled and the caller returns immediately.

  * With no credentials configured the console channel renders every message
    to the log, so the whole pipeline is testable before any account exists.
"""

from .channels import describe as channels_describe
from .service import leave_cancelled, leave_submitted, step_decided

__all__ = [
    "leave_submitted",
    "step_decided",
    "leave_cancelled",
    "channels_describe",
]
