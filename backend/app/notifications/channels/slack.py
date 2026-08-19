"""Slack DM delivery.

Deliberately optional at import time. slack_sdk is not a hard dependency, so
the app must start and every other channel must keep working when it is
absent — installing the package and setting a token is what turns this on, and
nothing else in the codebase changes.

Note the cost this channel carries that email does not: a DM needs a Slack user
id, which is resolved from the person's email. That means every employee must
exist in the workspace under the same address held in the employee table, or
the lookup returns nothing and there is no-one to send to.
"""

import asyncio
import logging

from app.config import settings

from .base import Message, Recipient

log = logging.getLogger(__name__)

try:  # pragma: no cover - exercised by presence/absence of the package
    from slack_sdk import WebClient
    from slack_sdk.errors import SlackApiError

    _SDK = True
except ImportError:
    WebClient = None  # type: ignore[assignment]
    SlackApiError = Exception  # type: ignore[assignment,misc]
    _SDK = False


class SlackChannel:
    name = "slack"

    def __init__(self) -> None:
        self._client = None

    @property
    def is_configured(self) -> bool:
        return _SDK and bool(settings.slack_bot_token)

    def _get_client(self):
        # Built once, lazily: constructing it at import time would tie the
        # module's importability to configuration.
        if self._client is None and self.is_configured:
            self._client = WebClient(token=settings.slack_bot_token)
        return self._client

    async def send(self, recipient: Recipient, message: Message) -> bool:
        if not self.is_configured:
            return False
        try:
            # WebClient is synchronous, so it goes to a worker thread for the
            # same reason smtplib does.
            return await asyncio.to_thread(self._send_blocking, recipient, message)
        except Exception:
            log.exception("slack: dispatch failed for %s", recipient.email)
            return False


    def _send_blocking(self, recipient: Recipient, message: Message) -> bool:
        client = self._get_client()
        if client is None:
            return False

        target, addressed = self._resolve(client, recipient)
        if target is None:
            return False

        # Slack link syntax is <url|text>, not markdown. A channel post has to
        # name who it concerns; a DM does not, because it already arrived in
        # the right person's window.
        header = message.subject if addressed else f"{message.subject} - for {recipient.name}"
        text = f"*{header}*\n{message.body}"
        if message.link:
            text += f"\n\n<{message.link}|Open in Meridian>"

        try:
            client.chat_postMessage(channel=target, text=text)
            log.info("slack: sent %r to %s", message.subject, target)
            return True
        except SlackApiError as exc:
            err = getattr(exc, "response", {}).get("error", exc)
            if err == "not_in_channel":
                log.error(
                    "slack: the bot is not a member of %s - invite it with "
                    "/invite @<bot name> in that channel",
                    target,
                )
            else:
                log.error("slack: could not post to %s - %s", target, err)
            return False

    def _resolve(self, client, recipient: Recipient) -> tuple[str | None, bool]:
        """Where to post, and whether it reaches the person directly.

        A DM is preferred because it is addressed and private. It requires the
        person to exist in the workspace under the same address the employee
        record holds, which seeded staff will not, so the configured channel is
        a fallback rather than the primary route.
        """
        try:
            found = client.users_lookupByEmail(email=recipient.email)
            return found["user"]["id"], True
        except SlackApiError as exc:
            err = getattr(exc, "response", {}).get("error", exc)
            if settings.slack_hr_channel_id:
                log.info(
                    "slack: no workspace member for %s (%s) - posting to %s instead",
                    recipient.email,
                    err,
                    settings.slack_hr_channel_id,
                )
                return settings.slack_hr_channel_id, False
            log.warning(
                "slack: no workspace member for %s (%s) and no channel configured",
                recipient.email,
                err,
            )
            return None, False
