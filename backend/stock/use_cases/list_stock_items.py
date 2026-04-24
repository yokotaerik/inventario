from sqlalchemy.orm import Session

from ..domain.stock_item import StockItem
from ..repository.stock_item_repository import StockItemRepository


class ListStockItemsUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = StockItemRepository(db)

    def execute(self) -> list[StockItem]:
        return self.repo.list_all()
