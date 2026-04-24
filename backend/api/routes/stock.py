from fastapi import APIRouter, Depends, HTTPException, status

from ...shared.database import get_db
from ...stock.schemas.stock_item_schemas import (
    NewStockItemRequest,
    UpdateStockItemRequest,
    serialize_stock_item,
)
from ...stock.use_cases.create_stock_item import CreateStockItemUseCase
from ...stock.use_cases.delete_stock_item import DeleteStockItemUseCase
from ...stock.use_cases.list_stock_items import ListStockItemsUseCase
from ...stock.use_cases.update_stock_item import UpdateStockItemUseCase
from ..auth import require_admin

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("")
async def list_stock(db=Depends(get_db)):
    use_case = ListStockItemsUseCase(db)
    items = use_case.execute()
    return [serialize_stock_item(item) for item in items]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_stock(payload: NewStockItemRequest, admin=Depends(require_admin), db=Depends(get_db)):
    try:
        use_case = CreateStockItemUseCase(db)
        items = use_case.execute(payload)
        if len(items) == 1:
            return serialize_stock_item(items[0])
        return {
            "created_count": len(items),
            "items": [serialize_stock_item(item) for item in items],
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{stock_id}")
async def update_stock(stock_id: int, payload: UpdateStockItemRequest, admin=Depends(require_admin), db=Depends(get_db)):
    try:
        use_case = UpdateStockItemUseCase(db)
        item = use_case.execute(stock_id, payload)
        return serialize_stock_item(item)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{stock_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stock(stock_id: int, admin=Depends(require_admin), db=Depends(get_db)):
    try:
        use_case = DeleteStockItemUseCase(db)
        use_case.execute(stock_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
