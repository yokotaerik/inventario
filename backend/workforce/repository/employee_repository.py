from typing import Optional

from sqlalchemy.orm import Session

from ..domain.employee import Employee


class EmployeeRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, employee_id: int) -> Optional[Employee]:
        return self.db.query(Employee).filter(Employee.id == employee_id).first()

    def get_by_email(self, email: str) -> Optional[Employee]:
        return self.db.query(Employee).filter(Employee.email == email).first()

    def list_all(self) -> list[Employee]:
        return self.db.query(Employee).order_by(Employee.name.asc()).all()

    def list_active(self) -> list[Employee]:
        return self.db.query(Employee).filter(Employee.is_active.is_(True)).all()

    def add(self, employee: Employee) -> None:
        self.db.add(employee)

    def delete(self, employee: Employee) -> None:
        self.db.delete(employee)
