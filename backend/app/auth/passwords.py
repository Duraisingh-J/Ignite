"""Password hashing.

PBKDF2-HMAC-SHA256 from the standard library rather than bcrypt or argon2, for
one practical reason: neither needs a compiler here, and a pluggable auth module
that fails to install on Windows is not pluggable. PBKDF2 with a high iteration
count is a respectable choice, and the stored format carries its own parameters
so the cost can be raised later without invalidating existing hashes.

    pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
"""

import hashlib
import hmac
import secrets

ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 240_000
SALT_BYTES = 16


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
    return f"{ALGORITHM}${ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """Constant-time check against a stored hash.

    Returns False for a malformed hash rather than raising: a corrupt row must
    fail the login, not crash the endpoint and leak a stack trace.
    """
    try:
        algorithm, iterations, salt_hex, expected_hex = stored.split("$")
        if algorithm != ALGORITHM:
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations)
        )
    except (ValueError, AttributeError):
        return False
    # compare_digest, not ==, so the comparison does not leak how much of the
    # hash matched through its timing.
    return hmac.compare_digest(digest.hex(), expected_hex)


def dummy_verify() -> None:
    """Burn roughly one verification's worth of time.

    Called when the account does not exist. Without it, a missing account
    returns in microseconds while a wrong password takes ~100ms, and that
    difference tells an attacker which addresses are real.
    """
    hashlib.pbkdf2_hmac("sha256", b"x", b"y", ITERATIONS)
