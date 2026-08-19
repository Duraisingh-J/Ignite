"""The port every delivery channel implements.

A channel knows how to put a rendered message in front of one person. It knows
nothing about leave, approval chains or why it was asked — that decision was
already made upstream. Adding a channel means adding one file that satisfies
this protocol and registering it; no existing code changes.
"""

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class Recipient:
    """Who to reach, in whatever address a channel understands.

    Carries every identifier rather than one, because the channel picks: email
    uses `email`, Slack looks the same address up to find a user id.
    """

    name: str
    email: str


@dataclass(frozen=True)
class Message:
    """A rendered notification, channel-agnostic.

    `subject` is used by channels that have one and folded into the body by
    those that do not, so a template is written once for every channel.
    """

    subject: str
    body: str
    # Where the recipient goes to act on this. Rendered as a link by channels
    # that support one and appended as a plain URL by those that do not.
    link: str | None = None


@runtime_checkable
class Channel(Protocol):
    """A delivery mechanism. Implementations must not raise."""

    name: str

    @property
    def is_configured(self) -> bool:
        """True when this channel has the credentials it needs.

        An unconfigured channel is skipped rather than attempted, so a missing
        password produces one clear log line instead of a failure per message.
        """
        ...

    async def send(self, recipient: Recipient, message: Message) -> bool:
        """Deliver, returning success. Must swallow its own errors.

        A notification is never worth failing the action that triggered it:
        nobody should be unable to request leave because Gmail is down.
        """
        ...
