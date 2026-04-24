from sqlalchemy.orm import Session

from ...shared.exceptions import ConflictError, NotFoundError
from ...shared.product_code import next_product_code
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

        product_code = payload.product_code
        if payload.project_id is not None:
            from ...projects.domain.project import Project
            project = self.db.query(Project).filter(Project.id == payload.project_id).first()
            if not project:
                raise NotFoundError("Projeto não encontrado")
            if not product_code or not product_code.strip():
                product_code = next_product_code(self.db, project.code)
            else:
                product_code = product_code.strip()
                if self.item_repo.get_by_product_code(product_code):
                    raise ConflictError(f"Já existe item com o código de produto '{product_code}'")

        item = Item(
            name=payload.name,
            category=payload.category,
            qr_code_hash=payload.qr_code_hash,
            status=payload.status,
            parent_item_id=payload.parent_item_id,
            project_id=payload.project_id,
            product_code=product_code,
            purchase_code=payload.purchase_code,
            purchase_info=payload.purchase_info,
        )

        self.item_repo.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item
