from sqlalchemy.orm import Session

from ...loans.repository.loan_repository import LoanRepository
from ...shared.exceptions import NotFoundError, ValidationError
from ..repository.item_repository import ItemRepository


class DeleteItemUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.item_repo = ItemRepository(db)
        self.loan_repo = LoanRepository(db)

    def execute(self, item_id: int, delete_mode: str = "move_children") -> str:
        item = self.item_repo.get_by_id(item_id)
        if not item:
            raise NotFoundError("Item não encontrado")

        children = self.item_repo.list_children(item.id)

        if children and delete_mode not in {"move_children", "delete_children"}:
            raise ValidationError("Modo de exclusão inválido")

        if children and delete_mode == "move_children":
            for child in children:
                child.parent_item_id = item.parent_item_id
            self.loan_repo.delete_by_item_id(item.id)
            self.item_repo.delete(item)
            self.db.commit()
            return "Item excluído e subitens movidos"

        if children and delete_mode == "delete_children":
            ids_to_delete = self.item_repo.collect_descendant_ids(item.id)
            self.loan_repo.delete_by_item_ids(ids_to_delete)
            self.item_repo.delete_many_by_ids(ids_to_delete)
            self.db.commit()
            return "Item e subitens excluídos"

        self.loan_repo.delete_by_item_id(item.id)
        self.item_repo.delete(item)
        self.db.commit()
        return "Item excluído"
