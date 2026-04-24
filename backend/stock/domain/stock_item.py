from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from ...shared.database import Base


class StockItem(Base):
    __tablename__ = "stock_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String)
    quantity = Column(Integer, default=1, nullable=False)
    product_code = Column(String, unique=True, nullable=True, index=True)
    qr_code_hash = Column(String, unique=True, nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    purchase_code = Column(String, nullable=True)
    purchase_info = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="stock_items")
