from typing import Optional

from sqlalchemy.orm import Session

from ..domain.stock_item import StockItem


class StockItemRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> list[StockItem]:
        return self.db.query(StockItem).order_by(StockItem.name.asc()).all()

    def get_by_id(self, stock_item_id: int) -> Optional[StockItem]:
        return self.db.query(StockItem).filter(StockItem.id == stock_item_id).first()

    def get_by_product_code(self, code: str) -> Optional[StockItem]:
        return self.db.query(StockItem).filter(StockItem.product_code == code).first()

    def get_by_qr(self, qr_code_hash: str) -> Optional[StockItem]:
        return self.db.query(StockItem).filter(StockItem.qr_code_hash == qr_code_hash).first()

    def add(self, stock_item: StockItem) -> None:
        self.db.add(stock_item)

    def delete(self, stock_item: StockItem) -> None:
        self.db.delete(stock_item)
