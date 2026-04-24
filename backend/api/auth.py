from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..auth.repository.session_repository import SessionRepository
from ..shared.database import get_db
from ..workforce.domain.employee import Employee

auth_scheme = HTTPBearer(auto_error=False)


def get_current_employee(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
) -> Employee:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")

    repo = SessionRepository(db)
    session = repo.get_by_token(credentials.credentials)
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")

    return session.employee


def require_auth(employee: Employee = Depends(get_current_employee)) -> Employee:
    return employee


def require_admin(employee: Employee = Depends(get_current_employee)) -> Employee:
    if not employee.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
    return employee
