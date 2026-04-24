from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import require_auth
from ...auth.use_cases.login import LoginUseCase
from ...auth.use_cases.logout import LogoutUseCase
from ...shared.database import get_db
from ...shared.exceptions import DomainError
from ...workforce.domain.employee import Employee

router = APIRouter(prefix="/auth", tags=["auth"])
auth_scheme = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        use_case = LoginUseCase(db)
        result = use_case.execute(payload.email, payload.password)
        return result
    except DomainError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message)


@router.post("/logout")
def logout(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")

    use_case = LogoutUseCase(db)
    use_case.execute(credentials.credentials)
    return {"message": "ok"}


@router.get("/me")
def me(employee: Employee = Depends(require_auth)):
    return {
        "id": employee.id,
        "name": employee.name,
        "email": employee.email,
        "is_admin": employee.is_admin,
    }
