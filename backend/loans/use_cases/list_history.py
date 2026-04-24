from sqlalchemy.orm import Session

from ...inventory.repository.item_repository import ItemRepository
from ..repository.loan_repository import LoanRepository


class ListLoanHistoryUseCase:
    def __init__(self, db: Session):
        self.loan_repo = LoanRepository(db)
        self.item_repo = ItemRepository(db)

    def execute(self, limit: int = 200) -> list[dict]:
        loans = self.loan_repo.list_history(limit=limit)

        batch_root_ids = {loan.batch_root_item_id for loan in loans if loan.batch_root_item_id is not None}
        batch_root_name_by_id: dict[int, str] = {}
        if batch_root_ids:
            roots = self.item_repo.get_many_by_ids(list(batch_root_ids))
            batch_root_name_by_id = {root.id: root.name for root in roots}

        return [
            {
                "id": loan.id,
                "item_id": loan.item.id if loan.item else None,
                "parent_item_id": loan.item.parent_item_id if loan.item else None,
                "item_name": loan.item.name if loan.item else "Item removido",
                "item_category": loan.item.category if loan.item else "",
                "employee_name": loan.employee.name if loan.employee else "Desconhecido",
                "destino": loan.destino,
                "observacao": loan.observacao,
                "observacao_checkin": loan.observacao_checkin,
                "batch_code": loan.batch_code,
                "batch_root_item_id": loan.batch_root_item_id,
                "batch_root_item_name": batch_root_name_by_id.get(loan.batch_root_item_id),
                "checkout_time": loan.checkout_time.isoformat() if loan.checkout_time else None,
                "checkin_time": loan.checkin_time.isoformat() if loan.checkin_time else None,
            }
            for loan in loans
        ]
