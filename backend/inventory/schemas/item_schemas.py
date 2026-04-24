from typing import Optional

from pydantic import BaseModel

from ..domain.item import Item, ItemStatus


class NewItemRequest(BaseModel):
    name: str
    category: str
    qr_code_hash: str
    status: ItemStatus = ItemStatus.AVAILABLE
    parent_item_id: Optional[int] = None
    product_code: Optional[str] = None
    purchase_code: Optional[str] = None
    purchase_info: Optional[str] = None


class UpdateItemRequest(BaseModel):
    name: str
    category: str
    qr_code_hash: str
    status: ItemStatus
    parent_item_id: Optional[int] = None
    product_code: Optional[str] = None
    purchase_code: Optional[str] = None
    purchase_info: Optional[str] = None


def build_item_relationship_maps(items: list[Item]) -> tuple[dict[int, str], dict[int, int]]:
    parent_name_by_id = {item.id: item.name for item in items}
    child_count_by_parent: dict[int, int] = {}
    for item in items:
        if item.parent_item_id is None:
            continue
        child_count_by_parent[item.parent_item_id] = child_count_by_parent.get(item.parent_item_id, 0) + 1
    return parent_name_by_id, child_count_by_parent


def serialize_item(
    item: Item,
    parent_name_by_id: dict[int, str],
    child_count_by_parent: dict[int, int],
) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "qr_code_hash": item.qr_code_hash,
        "status": item.status.value,
        "parent_item_id": item.parent_item_id,
        "parent_item_name": parent_name_by_id.get(item.parent_item_id),
        "has_sub_items": child_count_by_parent.get(item.id, 0) > 0,
        "product_code": item.product_code,
        "purchase_code": item.purchase_code,
        "purchase_info": item.purchase_info,
    }

