from functools import lru_cache
from urllib.parse import quote

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 4000
    cors_origins: str = "http://localhost:5173"

    # DATABASE_URL wins when set; otherwise assembled from the PG* fields.
    database_url: str | None = None
    pghost: str = "localhost"
    pgport: int = 5432
    pguser: str = "postgres"
    pgpassword: str = ""
    pgdatabase: str = "leave_management"

    pg_pool_min: int = 1
    pg_pool_max: int = 10
    # Seconds to wait for a pooled connection before giving up.
    pg_pool_timeout: float = 5.0

    # --- Authentication ---
    # Signing key. The default exists only so the file parses; the application
    # REFUSES TO START while it is still in place, because a known secret means
    # anyone who has read the source can mint an administrator token.
    #
    # There is deliberately no switch to disable authentication. One previously
    # existed to keep the admin screens usable before any account had been
    # created; that bootstrapping problem is solved by scripts/create_admin.py,
    # and an off switch for a security control is a liability once the reason
    # for it has gone.
    jwt_secret: str = "dev-only-insecure-change-me-0000000000"
    jwt_ttl_minutes: int = 720  # 12h — long enough not to interrupt a demo

    @property
    def jwt_secret_is_default(self) -> bool:
        return self.jwt_secret == "dev-only-insecure-change-me-0000000000"

    # --- Notifications ---
    # Where a recipient is told to go to act. Used in message bodies.
    app_base_url: str = "http://localhost:5174"
    # Sender identity is the SMTP account itself; there is no separate FROM,
    # because Gmail rewrites a mismatched From to the authenticated user
    # anyway and the two silently disagreeing is worse than having one.
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    # Seconds. Gmail can hang well past this on a bad network, and a mail
    # send must never outlive the request that triggered it.
    smtp_timeout: float = 10.0
    slack_bot_token: str | None = None
    # Fallback destination when a person cannot be resolved to a Slack DM,
    # which is the normal case for seeded staff whose addresses do not exist
    # in the workspace. A channel post names its intended recipient, since
    # unlike a DM it does not carry that by itself.
    slack_hr_channel_id: str | None = None
    # Master switch. With this off nothing is sent and every message is
    # logged instead, which is how the flow is tested without credentials.
    notifications_enabled: bool = True

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_username and self.smtp_password)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def dsn(self, database: str | None = None) -> str:
        """Connection string for `database` (defaults to the configured one).

        User and password are percent-encoded: passwords routinely contain
        characters like '@', ':' or '/' that would otherwise be parsed as URI
        delimiters and silently produce a wrong host or database.
        """
        if self.database_url and database is None:
            return self.database_url
        db = database or self.pgdatabase
        user = quote(self.pguser, safe="")
        password = quote(self.pgpassword, safe="")
        return f"postgresql://{user}:{password}@{self.pghost}:{self.pgport}/{db}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
