"""Dry-run delivery: log the message instead of sending it.

This is what makes the whole pipeline testable with no credentials at all. It
is not a stub — it is selected automatically whenever no real channel is
configured, so the routing, templating and recipient resolution are exercised
exactly as they would be in production and only the final hop changes.
"""

import logging

from .base import Message, Recipient

log = logging.getLogger(__name__)


class ConsoleChannel:
    name = "console"

    @property
    def is_configured(self) -> bool:
        # Always available; it is the floor the dispatcher falls back to.
        return True

    async def send(self, recipient: Recipient, message: Message) -> bool:
        log.info(
            "\n"
            "+-- NOTIFICATION (dry run) ---------------------------------\n"
            "| To      : %s <%s>\n"
            "| Subject : %s\n"
            "|\n"
            "%s\n"
            "| Link    : %s\n"
            "+-----------------------------------------------------------",
            recipient.name,
            recipient.email,
            message.subject,
            "\n".join(f"| {line}" for line in message.body.splitlines()),
            message.link or "-",
        )
        return True
