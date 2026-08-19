"""Channel registry.

To add a delivery mechanism: write a class satisfying the Channel protocol in
this package, then add it to _ALL below. Nothing else in the application knows
which channels exist.

Every configured channel receives every message. They are not alternatives:
a Slack channel is a team feed and an email is addressed to the individual, so
delivering to only the first would mean enabling Slack quietly disabled email.
Console is not in this list — it is the floor the dispatcher falls back to when
nothing else is configured at all.
"""

from .base import Channel, Message, Recipient
from .console import ConsoleChannel
from .email import EmailChannel
from .slack import SlackChannel

_ALL: list[Channel] = [SlackChannel(), EmailChannel()]

_CONSOLE = ConsoleChannel()


def active() -> list[Channel]:
    """Configured channels, in preference order.

    Falling back to the console channel rather than returning nothing is what
    lets the pipeline be developed and demonstrated without credentials: the
    message is still rendered and still addressed, it just lands in the log.
    """
    live = [c for c in _ALL if c.is_configured]
    return live or [_CONSOLE]


def describe() -> dict:
    """What is switched on — surfaced by /health for diagnosis."""
    return {
        "active": [c.name for c in active()],
        "available": {c.name: c.is_configured for c in _ALL},
    }


__all__ = ["Channel", "Message", "Recipient", "active", "describe"]
