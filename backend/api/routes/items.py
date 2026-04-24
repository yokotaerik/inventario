from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ...inventory.repository.item_repository import ItemRepository
from ...inventory.schemas.item_schemas import (
    NewItemRequest,
    UpdateItemRequest,
    build_item_relationship_maps,
    serialize_item,
)
from ...inventory.use_cases.create_item import CreateItemUseCase
from ...inventory.use_cases.delete_item import DeleteItemUseCase
from ...inventory.use_cases.get_item_by_qr import GetItemByQRUseCase
from ...inventory.use_cases.get_items_status import GetItemsStatusUseCase
from ...inventory.use_cases.list_items import ListItemsUseCase
from ...inventory.use_cases.update_item import UpdateItemUseCase
from ...shared.database import get_db
from ..auth import require_admin

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/status", response_model=None)
def get_items_status(db: Session = Depends(get_db)):
    return GetItemsStatusUseCase(db).execute()


@router.get("/qr/{qr_hash}", response_model=None)
def get_item_by_qr(qr_hash: str, db: Session = Depends(get_db)):
    return GetItemByQRUseCase(db).execute(qr_hash)


@router.get("", response_model=None, dependencies=[Depends(require_admin)])
def list_items(db: Session = Depends(get_db)):
    items = ListItemsUseCase(db).execute()
    parent_name_by_id, child_count_by_parent = build_item_relationship_maps(items)
    return [serialize_item(item, parent_name_by_id, child_count_by_parent) for item in items]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=None,
    dependencies=[Depends(require_admin)],
)
def create_item(payload: NewItemRequest, db: Session = Depends(get_db)):
    item = CreateItemUseCase(db).execute(payload)
    all_items = ItemRepository(db).list_all()
    parent_name_by_id, child_count_by_parent = build_item_relationship_maps(all_items)
    return serialize_item(item, parent_name_by_id, child_count_by_parent)


@router.put("/{item_id}", response_model=None, dependencies=[Depends(require_admin)])
def update_item(item_id: int, payload: UpdateItemRequest, db: Session = Depends(get_db)):
    item = UpdateItemUseCase(db).execute(item_id, payload)
    all_items = ItemRepository(db).list_all()
    parent_name_by_id, child_count_by_parent = build_item_relationship_maps(all_items)
    return serialize_item(item, parent_name_by_id, child_count_by_parent)


@router.delete("/{item_id}", response_model=None, dependencies=[Depends(require_admin)])
def delete_item(
    item_id: int,
    delete_mode: str = "move_children",
    db: Session = Depends(get_db),
):
    message = DeleteItemUseCase(db).execute(item_id, delete_mode)
    return {"message": message}
