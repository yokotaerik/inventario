import enum

from sqlalchemy import Column, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from ...shared.database import Base


class ItemStatus(str, enum.Enum):
    AVAILABLE = "available"
    LENT = "lent"
    MAINTENANCE = "maintenance"


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String)
    qr_code_hash = Column(String, unique=True, index=True)
    status = Column(Enum(ItemStatus), default=ItemStatus.AVAILABLE)
    parent_item_id = Column(Integer, ForeignKey("items.id"), nullable=True, index=True)

    product_code = Column(String, unique=True, nullable=True, index=True)
    purchase_code = Column(String, nullable=True)
    purchase_info = Column(String, nullable=True)

    parent_item = relationship("Item", remote_side=[id], back_populates="sub_items")
    sub_items = relationship("Item", back_populates="parent_item")
