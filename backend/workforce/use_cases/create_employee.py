from sqlalchemy.orm import Session

from ...shared.exceptions import ValidationError
from ...shared.security import hash_password
from ..domain.employee import Employee
from ..repository.employee_repository import EmployeeRepository
from ..schemas.employee_schemas import NewEmployeeRequest


class CreateEmployeeUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = EmployeeRepository(db)

    def execute(self, payload: NewEmployeeRequest) -> Employee:
        name = payload.name.strip()
        department = payload.department.strip() if payload.department else None

        if not name:
            raise ValidationError("Nome do funcionário é obrigatório")

        password_hash = None
        if payload.password:
            password_hash = hash_password(payload.password)

        employee = Employee(
            name=name,
            department=department,
            is_active=payload.is_active,
            location_id=payload.location_id,
            email=payload.email,
            password_hash=password_hash,
            is_admin=payload.is_admin,
        )
        self.repo.add(employee)
        self.db.commit()
        self.db.refresh(employee)
        return employee
