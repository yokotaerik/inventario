from sqlalchemy.orm import Session

from ...loans.repository.loan_repository import LoanRepository
from ...shared.exceptions import NotFoundError, ValidationError
from ..repository.employee_repository import EmployeeRepository


class DeleteEmployeeUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = EmployeeRepository(db)
        self.loan_repo = LoanRepository(db)

    def execute(self, employee_id: int) -> str:
        employee = self.repo.get_by_id(employee_id)
        if not employee:
            raise NotFoundError("Funcionário não encontrado")

        if self.loan_repo.has_any_for_employee(employee_id):
            raise ValidationError(
                "Não é possível excluir funcionário com histórico de movimentações"
            )

        self.repo.delete(employee)
        self.db.commit()
        return "Funcionário excluído"
