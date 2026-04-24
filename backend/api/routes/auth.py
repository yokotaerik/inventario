from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from ..auth import ADMIN_TOKEN, ADMIN_USERNAME, check_admin_credentials

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(payload: LoginRequest):
    if not check_admin_credentials(payload.username, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login inválido")

    return {
        "token": ADMIN_TOKEN,
        "user": {
            "username": ADMIN_USERNAME,
            "role": "admin",
        },
    }
