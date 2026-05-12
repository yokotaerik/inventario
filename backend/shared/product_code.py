from sqlalchemy.orm import Session


def next_product_code(db: Session, customer_code: str, project_code: str, location_code: str) -> str:
    """
    Generate next product code in format: {customer_code}-{project_code}-{location_suffix}-{NNNN}

    Example: VW-70AB12-01-0001

    Args:
        db: SQLAlchemy session
        customer_code: Customer code (e.g., "VW")
        project_code: Project code (e.g., "70AB12")
        location_code: Location code (e.g., "70AB12-L01")

    Returns:
        Next product code in the format above
    """
    from ..inventory.domain.item import Item
    from ..stock.domain.stock_item import StockItem

    # Extract location suffix from location_code
    # Format: "{project_code}-L{NN}" → extract "NN"
    location_suffix = "00"
    if location_code and "-L" in location_code:
        try:
            parts = location_code.split("-L")
            if len(parts) == 2:
                location_suffix = parts[1]
        except (ValueError, IndexError):
            location_suffix = "00"

    # Build prefix for querying existing codes
    prefix = f"{customer_code}-{project_code}-{location_suffix}-"

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

    return f"{customer_code}-{project_code}-{location_suffix}-{(max_suffix + 1):04d}"
