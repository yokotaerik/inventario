from typing import List
from sqlalchemy.orm import Session

from ...shared.exceptions import ConflictError, NotFoundError, ValidationError
from ...shared.product_code import next_product_code
from ...projects.repository.project_repository import ProjectRepository
from ..domain.stock_item import StockItem
from ..repository.stock_item_repository import StockItemRepository
from ..schemas.stock_item_schemas import NewStockItemRequest


class CreateStockItemUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = StockItemRepository(db)

    def execute(self, payload: NewStockItemRequest) -> List[StockItem]:
        if payload.project_id is None:
            raise ValidationError("Projeto é obrigatório para gerar código do produto e QR no modo estoque")

        project_repo = ProjectRepository(self.db)
        project = project_repo.get_by_id(payload.project_id)
        if not project:
            raise NotFoundError("Projeto não encontrado")

        units = payload.units if payload.units and payload.units > 0 else 0
        if units == 0 and payload.quantity and payload.quantity > 0:
            units = payload.quantity
        if units <= 0:
            units = 1
        if units > 100:
            raise ValidationError("Máximo de 100 unidades por cadastro")

        manual_code = payload.product_code.strip() if payload.product_code and payload.product_code.strip() else None
        if manual_code and units > 1:
            raise ValidationError("Para múltiplas unidades, deixe o código do produto em branco para gerar automaticamente")

        created_items: List[StockItem] = []

        for index in range(units):
            if manual_code and index == 0:
                product_code = manual_code
                if self.repo.get_by_product_code(product_code):
                    raise ConflictError(f"Já existe item com o código de produto '{product_code}'")
            else:
                product_code = next_product_code(
                    self.db,
                    project.customer.code if project.customer else "DEFAULT",
                    project.code,
                )

            if self.repo.get_by_qr(product_code):
                raise ConflictError(f"Já existe item de estoque com QR '{product_code}'")

            stock_item = StockItem(
                name=payload.name,
                category=payload.category,
                quantity=1,
                qr_code_hash=product_code,
                product_code=product_code,
                project_id=payload.project_id,
                purchase_code=payload.purchase_code,
                purchase_info=payload.purchase_info,
            )

            self.repo.add(stock_item)
            self.db.flush()
            created_items.append(stock_item)

        self.db.commit()
        for stock_item in created_items:
            self.db.refresh(stock_item)
        return created_items
