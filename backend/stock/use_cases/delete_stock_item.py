from sqlalchemy.orm import Session

from ...shared.exceptions import NotFoundError
from ..domain.stock_item import StockItem
from ..repository.stock_item_repository import StockItemRepository


class DeleteStockItemUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = StockItemRepository(db)

    def execute(self, stock_item_id: int) -> None:
        stock_item = self.repo.get_by_id(stock_item_id)
        if not stock_item:
            raise NotFoundError("Item de estoque não encontrado")

        self.repo.delete(stock_item)
        self.db.commit()
