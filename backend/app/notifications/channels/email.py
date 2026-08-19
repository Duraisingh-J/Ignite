"""SMTP delivery.

smtplib is synchronous and the app is async, so the whole exchange runs in a
worker thread. Calling it directly would block the event loop for the length of
the TLS handshake and login — seconds against Gmail — freezing every other
request in the process, not just this one.

There is deliberately no separate FROM address. Gmail rewrites a From that does
not match the authenticated account, so configuring both invites them to
disagree silently; the SMTP username is the sender.
"""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

from .base import Message, Recipient

log = logging.getLogger(__name__)


class EmailChannel:
    name = "email"

    @property
    def is_configured(self) -> bool:
        return settings.smtp_configured

    async def send(self, recipient: Recipient, message: Message) -> bool:
        if not self.is_configured:
            return False
        try:
            return await asyncio.to_thread(self._send_blocking, recipient, message)
        except Exception:
            # to_thread itself failing (cancellation, thread exhaustion) still
            # must not surface to the caller.
            log.exception("email: dispatch failed for %s", recipient.email)
            return False

    def _send_blocking(self, recipient: Recipient, message: Message) -> bool:
        body = message.body
        if message.link:
            body = f"{body}\n\nOpen Meridian:\n{message.link}\n"

        msg = EmailMessage()
        msg["Subject"] = message.subject
        msg["From"] = settings.smtp_username
        msg["To"] = recipient.email
        msg.set_content(body)

        try:
            with smtplib.SMTP(
                settings.smtp_server, settings.smtp_port, timeout=settings.smtp_timeout
            ) as server:
                server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                server.send_message(msg)
            log.info("email: sent %r to %s", message.subject, recipient.email)
            return True
        except smtplib.SMTPAuthenticationError:
            # By far the most common setup failure, and the error Gmail returns
            # is unhelpfully generic, so name the actual cause.
            log.error(
                "email: authentication rejected for %s — Gmail requires a 16-character "
                "App Password with 2FA enabled, not the account password",
                settings.smtp_username,
            )
            return False
        except Exception as exc:
            log.error("email: could not send to %s — %s", recipient.email, exc)
            return False
