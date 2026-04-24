from sqlalchemy.orm import Session

from ..domain.employee import Employee
from ..repository.employee_repository import EmployeeRepository


class ListEmployeesUseCase:
    def __init__(self, db: Session):
        self.repo = EmployeeRepository(db)

    def execute(self) -> list[Employee]:
        return self.repo.list_all()


class ListActiveEmployeesUseCase:
    def __init__(self, db: Session):
        self.repo = EmployeeRepository(db)

    def execute(self) -> list[Employee]:
        return self.repo.list_active()
