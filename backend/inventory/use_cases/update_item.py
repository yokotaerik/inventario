from typing import Optional

from sqlalchemy.orm import Session

from ...shared.exceptions import ConflictError, NotFoundError, ValidationError
from ..domain.item import Item
from ..repository.item_repository import ItemRepository
from ..schemas.item_schemas import UpdateItemRequest


class UpdateItemUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.item_repo = ItemRepository(db)

    def execute(self, item_id: int, payload: UpdateItemRequest) -> Item:
        item = self.item_repo.get_by_id(item_id)
        if not item:
            raise NotFoundError("Item não encontrado")

        if self.item_repo.exists_by_qr(payload.qr_code_hash, exclude_id=item_id):
            raise ConflictError("Já existe item com este QR Code")

        self._validate_parent_assignment(item_id, payload.parent_item_id)

        item.name = payload.name
        item.category = payload.category
        item.qr_code_hash = payload.qr_code_hash
        item.status = payload.status
        item.parent_item_id = payload.parent_item_id
        item.purchase_code = payload.purchase_code
        item.purchase_info = payload.purchase_info

        self.db.commit()
        self.db.refresh(item)
        return item

    def _validate_parent_assignment(self, item_id: int, parent_item_id: Optional[int]) -> None:
        if parent_item_id is None:
            return

        if parent_item_id == item_id:
            raise ValidationError("Um item não pode ser pai dele mesmo")

        parent_item = self.item_repo.get_by_id(parent_item_id)
        if not parent_item:
            raise ValidationError("Item pai não encontrado")

        current_parent_id = parent_item.parent_item_id
        while current_parent_id is not None:
            if current_parent_id == item_id:
                raise ValidationError("Hierarquia inválida: ciclo detectado")
            next_parent = self.item_repo.get_by_id(current_parent_id)
            current_parent_id = next_parent.parent_item_id if next_parent else None
