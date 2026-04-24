from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from ...inventory.domain.item import ItemStatus
from ...inventory.repository.item_repository import ItemRepository
from ...shared.exceptions import ConflictError, NotFoundError, ValidationError
from ...workforce.repository.employee_repository import EmployeeRepository
from ..domain.loan import Loan
from ..repository.loan_repository import LoanRepository
from ..specifications.specs import (
    ItemIsAvailableSpec,
    ItemNotAlreadyLentSpec,
    LoanRequiresDestinationSpec,
    LoanRequiresEmployeeSpec,
)


class CreateLoanUseCase:
    """Empréstimo individual de um item. Destino e funcionário são obrigatórios."""

    def __init__(self, db: Session):
        self.db = db
        self.item_repo = ItemRepository(db)
        self.employee_repo = EmployeeRepository(db)
        self.loan_repo = LoanRepository(db)

    def execute(
        self,
        item_id: int,
        employee_id: int,
        destino: Optional[str],
        expected_return: Optional[datetime] = None,
        observacao: Optional[str] = None,
    ) -> Loan:
        destino_normalized = destino.strip() if destino else None
        observacao_normalized = observacao.strip() if observacao else None

        if not LoanRequiresDestinationSpec().is_satisfied_by(destino_normalized):
            raise ValidationError("Destino é obrigatório")

        item = self.item_repo.get_by_id(item_id)
        if not item:
            raise NotFoundError("Item não encontrado")

        employee = self.employee_repo.get_by_id(employee_id)
        if not LoanRequiresEmployeeSpec().is_satisfied_by(employee):
            raise NotFoundError("Funcionário não encontrado")

        if not ItemIsAvailableSpec().is_satisfied_by(item):
            raise ConflictError("Item não está disponível")

        active_loan = self.loan_repo.get_active_by_item_id(item_id)
        if not ItemNotAlreadyLentSpec().is_satisfied_by(active_loan):
            raise ConflictError("Item já possui empréstimo ativo")

        loan = Loan(
            item_id=item_id,
            employee_id=employee_id,
            expected_return=expected_return,
            observacao=observacao_normalized,
            destino=destino_normalized,
        )
        item.status = ItemStatus.LENT

        self.loan_repo.add(loan)
        self.db.commit()
        self.db.refresh(loan)
        return loan
