from sqlalchemy.orm import Session

from ..domain.item import Item
from ..repository.item_repository import ItemRepository


class ListItemsUseCase:
    def __init__(self, db: Session):
        self.item_repo = ItemRepository(db)

    def execute(self) -> list[Item]:
        return self.item_repo.list_all()
