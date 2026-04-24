from sqlalchemy.orm import Session

from ...loans.repository.loan_repository import LoanRepository
from ..repository.item_repository import ItemRepository
from ..schemas.item_schemas import build_item_relationship_maps


class GetItemsStatusUseCase:
    """Endpoint público pro dashboard: lista todos os itens com quem está com cada um."""

    def __init__(self, db: Session):
        self.item_repo = ItemRepository(db)
        self.loan_repo = LoanRepository(db)

    def execute(self) -> list[dict]:
        items = self.item_repo.list_all()
        active_loans = self.loan_repo.list_active()

        holder_by_item = {
            loan.item_id: (loan.employee.name if loan.employee else None)
            for loan in active_loans
        }
        parent_name_by_id, child_count_by_parent = build_item_relationship_maps(items)

        return [
            {
                "id": item.id,
                "name": item.name,
                "category": item.category,
                "status": item.status.value,
                "holder": holder_by_item.get(item.id),
                "parent_item_id": item.parent_item_id,
                "parent_item_name": parent_name_by_id.get(item.parent_item_id),
                "has_sub_items": child_count_by_parent.get(item.id, 0) > 0,
                "project_id": item.project_id,
                "project_name": item.project.name if item.project else None,
                "project_code": item.project.code if item.project else None,
            }
            for item in items
        ]

