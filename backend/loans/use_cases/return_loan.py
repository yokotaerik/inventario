from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from ...inventory.domain.item import ItemStatus
from ...inventory.repository.item_repository import ItemRepository
from ...shared.exceptions import NotFoundError
from ..repository.loan_repository import LoanRepository


class ReturnLoanUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.loan_repo = LoanRepository(db)
        self.item_repo = ItemRepository(db)

    def execute(self, item_id: int, observacao: Optional[str] = None) -> str:
        loan = self.loan_repo.get_active_by_item_id(item_id)
        if not loan:
            raise NotFoundError("Nenhuma transação ativa encontrada para este item")

        loan.checkin_time = datetime.utcnow()
        loan.observacao_checkin = observacao.strip() if observacao else None

        item = self.item_repo.get_by_id(item_id)
        if item:
            item.status = ItemStatus.AVAILABLE

        self.db.commit()
        return "Devolução confirmada"
