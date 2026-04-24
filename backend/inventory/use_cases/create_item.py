from sqlalchemy.orm import Session

from ...shared.exceptions import ConflictError, NotFoundError
from ..domain.item import Item
from ..repository.item_repository import ItemRepository
from ..schemas.item_schemas import NewItemRequest


class CreateItemUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.item_repo = ItemRepository(db)

    def execute(self, payload: NewItemRequest) -> Item:
        if self.item_repo.exists_by_qr(payload.qr_code_hash):
            raise ConflictError("Já existe item com este QR Code")

        if payload.parent_item_id is not None:
            parent = self.item_repo.get_by_id(payload.parent_item_id)
            if not parent:
                raise NotFoundError("Item pai não encontrado")

        item = Item(
            name=payload.name,
            category=payload.category,
            qr_code_hash=payload.qr_code_hash,
            status=payload.status,
            parent_item_id=payload.parent_item_id,
            project_id=payload.project_id,
            purchase_code=payload.purchase_code,
            purchase_info=payload.purchase_info,
        )

        self.item_repo.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item
