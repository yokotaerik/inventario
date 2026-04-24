from typing import Optional

from ...inventory.domain.item import Item, ItemStatus
from ...loans.domain.loan import Loan
from ...workforce.domain.employee import Employee


class ItemIsAvailableSpec:
    """Item precisa existir e estar com status AVAILABLE."""

    def is_satisfied_by(self, item: Optional[Item]) -> bool:
        return item is not None and item.status == ItemStatus.AVAILABLE


class ItemNotAlreadyLentSpec:
    """Não pode existir empréstimo ativo pro item."""

    def is_satisfied_by(self, active_loan: Optional[Loan]) -> bool:
        return active_loan is None


class LoanRequiresEmployeeSpec:
    """Empréstimo exige funcionário existente."""

    def is_satisfied_by(self, employee: Optional[Employee]) -> bool:
        return employee is not None


class LoanRequiresDestinationSpec:
    """Empréstimo exige destino não-vazio."""

    def is_satisfied_by(self, destino: Optional[str]) -> bool:
        return destino is not None and destino.strip() != ""
