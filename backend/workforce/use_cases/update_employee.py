from sqlalchemy.orm import Session

from ...shared.exceptions import NotFoundError, ValidationError
from ..domain.employee import Employee
from ..repository.employee_repository import EmployeeRepository
from ..schemas.employee_schemas import UpdateEmployeeRequest


class UpdateEmployeeUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = EmployeeRepository(db)

    def execute(self, employee_id: int, payload: UpdateEmployeeRequest) -> Employee:
        employee = self.repo.get_by_id(employee_id)
        if not employee:
            raise NotFoundError("Funcionário não encontrado")

        name = payload.name.strip()
        department = payload.department.strip() if payload.department else None

        if not name:
            raise ValidationError("Nome do funcionário é obrigatório")

        employee.name = name
        employee.department = department
        employee.is_active = payload.is_active
        employee.location_id = payload.location_id

        self.db.commit()
        self.db.refresh(employee)
        return employee
