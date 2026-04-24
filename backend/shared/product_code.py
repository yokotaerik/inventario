from sqlalchemy.orm import Session


def next_product_code(db: Session, project_code: str) -> str:
    from ..inventory.domain.item import Item
    from ..stock.domain.stock_item import StockItem

    prefix = f"{project_code}-"
    items = db.query(Item.product_code).filter(
        Item.product_code.isnot(None),
        Item.product_code.startswith(prefix),
    ).all()
    stock_items = db.query(StockItem.product_code).filter(
        StockItem.product_code.isnot(None),
        StockItem.product_code.startswith(prefix),
    ).all()

    max_suffix = 0
    for (code,) in items + stock_items:
        if code and code.startswith(prefix):
            try:
                suffix = int(code[len(prefix):])
                max_suffix = max(max_suffix, suffix)
            except (ValueError, IndexError):
                pass

    return f"{project_code}-{(max_suffix + 1):04d}"
