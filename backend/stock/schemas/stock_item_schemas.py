from typing import Optional

from pydantic import BaseModel

from ..domain.stock_item import StockItem


class NewStockItemRequest(BaseModel):
    name: str
    category: str
    units: int = 1
    quantity: Optional[int] = None
    qr_code_hash: Optional[str] = None
    project_id: Optional[int] = None
    location_id: Optional[int] = None
    purchase_code: Optional[str] = None
    purchase_info: Optional[str] = None


class UpdateStockItemRequest(BaseModel):
    name: str
    category: str
    quantity: Optional[int] = None
    project_id: Optional[int] = None
    location_id: Optional[int] = None
    qr_code_hash: Optional[str] = None
    purchase_code: Optional[str] = None
    purchase_info: Optional[str] = None


def serialize_stock_item(stock_item: StockItem) -> dict:
    project = stock_item.project
    return {
        "id": stock_item.id,
        "name": stock_item.name,
        "category": stock_item.category,
        "quantity": stock_item.quantity,
        "product_code": stock_item.product_code,
        "qr_code_hash": stock_item.qr_code_hash,
        "project_id": stock_item.project_id,
        "project_name": project.name if project else None,
        "project_code": project.code if project else None,
        "location_id": stock_item.location_id,
        "location_name": stock_item.location.name if stock_item.location else None,
        "purchase_code": stock_item.purchase_code,
        "purchase_info": stock_item.purchase_info,
        "created_at": stock_item.created_at.isoformat() if stock_item.created_at else None,
    }
