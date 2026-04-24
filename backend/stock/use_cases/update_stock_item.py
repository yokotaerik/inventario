from sqlalchemy.orm import Session

from ...shared.exceptions import ConflictError, NotFoundError, ValidationError
from ...shared.product_code import next_product_code
from ..domain.stock_item import StockItem
from ..repository.stock_item_repository import StockItemRepository
from ..schemas.stock_item_schemas import UpdateStockItemRequest


class UpdateStockItemUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = StockItemRepository(db)

    def execute(self, stock_item_id: int, payload: UpdateStockItemRequest) -> StockItem:
        stock_item = self.repo.get_by_id(stock_item_id)
        if not stock_item:
            raise NotFoundError("Item de estoque não encontrado")

        stock_item.name = payload.name
        stock_item.category = payload.category
        stock_item.project_id = payload.project_id
        stock_item.purchase_code = payload.purchase_code
        stock_item.purchase_info = payload.purchase_info

        if not stock_item.product_code:
            if stock_item.project_id is None:
                raise ValidationError("Projeto é obrigatório para gerar código do produto e QR")
            from ...projects.domain.project import Project

            project = self.db.query(Project).filter(Project.id == stock_item.project_id).first()
            if not project:
                raise NotFoundError("Projeto não encontrado")
            stock_item.product_code = next_product_code(self.db, project.code)

        if payload.qr_code_hash and payload.qr_code_hash != stock_item.product_code:
            raise ValidationError("QR é automático e deve ser igual ao código do produto")

        duplicate_qr = self.db.query(StockItem).filter(
            StockItem.qr_code_hash == stock_item.product_code,
            StockItem.id != stock_item.id,
        ).first()
        if duplicate_qr:
            raise ConflictError("Já existe item de estoque com este QR Code")

        stock_item.qr_code_hash = stock_item.product_code
        stock_item.quantity = 1

        self.db.commit()
        self.db.refresh(stock_item)
        return stock_item
