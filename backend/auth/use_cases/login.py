import secrets

from sqlalchemy.orm import Session

from ..repository.session_repository import SessionRepository
from ...shared.exceptions import ValidationError
from ...shared.security import verify_password
from ...workforce.repository.employee_repository import EmployeeRepository


class LoginUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.session_repo = SessionRepository(db)
        self.employee_repo = EmployeeRepository(db)

    def execute(self, email: str, password: str) -> dict:
        employee = self.employee_repo.get_by_email(email)
        if not employee or not employee.password_hash:
            raise ValidationError("E-mail ou senha inválidos")

        if not verify_password(password, employee.password_hash):
            raise ValidationError("E-mail ou senha inválidos")

        token = secrets.token_urlsafe(32)
        self.session_repo.create(token, employee.id)
        self.db.commit()

        return {
            "token": token,
            "user": {
                "id": employee.id,
                "name": employee.name,
                "email": employee.email,
                "is_admin": employee.is_admin,
            },
        }
