from sqlalchemy.orm import Session

from ...loans.repository.loan_repository import LoanRepository
from ...loans.schemas.loan_schemas import serialize_active_loan
from ..repository.item_repository import ItemRepository
from ..schemas.item_schemas import build_item_relationship_maps, serialize_item
from ...shared.exceptions import NotFoundError


class GetItemByQRUseCase:
    """Endpoint público: retorna o item, sua família (pai + irmãos), e empréstimos ativos."""

    def __init__(self, db: Session):
        self.item_repo = ItemRepository(db)
        self.loan_repo = LoanRepository(db)

    def execute(self, qr_hash: str) -> dict:
        item = self.item_repo.get_by_qr(qr_hash)
        if not item:
            raise NotFoundError("Item não encontrado")

        all_items = self.item_repo.list_all()
        parent_name_by_id, child_count_by_parent = build_item_relationship_maps(all_items)

        container_item = item
        if item.parent_item_id is not None:
            container_item = self.item_repo.get_by_id(item.parent_item_id) or item

        children = self.item_repo.list_children(container_item.id)

        family_items = [container_item] + children
        family_item_ids = [fi.id for fi in family_items]
        active_loan_map = self.loan_repo.active_map_by_item_ids(family_item_ids)

        family_children = [
            self._serialize_family_member(
                child, parent_name_by_id, child_count_by_parent, active_loan_map.get(child.id)
            )
            for child in children
        ]

        family_lent_items = [
            self._serialize_family_member(
                fi, parent_name_by_id, child_count_by_parent, active_loan_map.get(fi.id)
            )
            for fi in family_items
            if active_loan_map.get(fi.id)
        ]

        return {
            "item": serialize_item(item, parent_name_by_id, child_count_by_parent),
            "current_transaction": serialize_active_loan(active_loan_map.get(item.id)),
            "family_container_id": container_item.id,
            "family_children": family_children,
            "family_lent_items": family_lent_items,
            "is_container_scan": item.id == container_item.id and len(children) > 0,
        }

    @staticmethod
    def _serialize_family_member(item, parent_name_by_id, child_count_by_parent, active_loan):
        payload = serialize_item(item, parent_name_by_id, child_count_by_parent)
        payload["current_transaction"] = serialize_active_loan(active_loan)
        return payload
