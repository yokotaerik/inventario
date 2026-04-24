import os
import secrets
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

ADMIN_USERNAME = os.getenv("INVENTORY_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("INVENTORY_ADMIN_PASSWORD", "admin123")
ADMIN_TOKEN = os.getenv("INVENTORY_ADMIN_TOKEN", "inventory-admin-token")

auth_scheme = HTTPBearer(auto_error=False)


def require_admin(credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme)):
    if (
        credentials is None
        or credentials.scheme.lower() != "bearer"
        or not secrets.compare_digest(credentials.credentials, ADMIN_TOKEN)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")


def check_admin_credentials(username: str, password: str) -> bool:
    valid_user = secrets.compare_digest(username, ADMIN_USERNAME)
    valid_password = secrets.compare_digest(password, ADMIN_PASSWORD)
    return valid_user and valid_password
