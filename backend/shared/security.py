import bcrypt


def _encode(password: str) -> bytes:
    return password.encode("utf-8")[:72]


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(_encode(plain), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(_encode(plain), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False
