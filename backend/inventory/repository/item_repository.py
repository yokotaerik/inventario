from typing import Optional

from sqlalchemy.orm import Session

from ..domain.item import Item


class ItemRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, item_id: int) -> Optional[Item]:
        return self.db.query(Item).filter(Item.id == item_id).first()

    def get_by_qr(self, qr_code_hash: str) -> Optional[Item]:
        return self.db.query(Item).filter(Item.qr_code_hash == qr_code_hash).first()

    def get_many_by_ids(self, item_ids: list[int]) -> list[Item]:
        if not item_ids:
            return []
        return self.db.query(Item).filter(Item.id.in_(item_ids)).all()

    def list_all(self) -> list[Item]:
        return self.db.query(Item).order_by(Item.name.asc()).all()

    def list_children(self, parent_id: int) -> list[Item]:
        return (
            self.db.query(Item)
            .filter(Item.parent_item_id == parent_id)
            .order_by(Item.name.asc())
            .all()
        )

    def exists_by_qr(self, qr_code_hash: str, exclude_id: Optional[int] = None) -> bool:
        query = self.db.query(Item).filter(Item.qr_code_hash == qr_code_hash)
        if exclude_id is not None:
            query = query.filter(Item.id != exclude_id)
        return query.first() is not None

    def add(self, item: Item) -> None:
        self.db.add(item)

    def delete(self, item: Item) -> None:
        self.db.delete(item)

    def delete_many_by_ids(self, item_ids: list[int]) -> None:
        if not item_ids:
            return
        self.db.query(Item).filter(Item.id.in_(item_ids)).delete(synchronize_session=False)

    def collect_descendant_ids(self, root_id: int) -> list[int]:
        collected: list[int] = []
        stack = [root_id]
        while stack:
            current_id = stack.pop()
            collected.append(current_id)
            children = self.db.query(Item.id).filter(Item.parent_item_id == current_id).all()
            stack.extend(child_id for (child_id,) in children)
        return collected
