from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from .database import Base

class ItemStatus(str, enum.Enum):
    AVAILABLE = "available"
    LENT = "lent"
    MAINTENANCE = "maintenance"

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    department = Column(String)
    is_active = Column(Boolean, default=True)

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String)
    # O hash do QR Code é o que será usado no link único
    qr_code_hash = Column(String, unique=True, index=True)
    status = Column(Enum(ItemStatus), default=ItemStatus.AVAILABLE)
    parent_item_id = Column(Integer, ForeignKey("items.id"), nullable=True, index=True)

    parent_item = relationship("Item", remote_side=[id], back_populates="sub_items")
    sub_items = relationship("Item", back_populates="parent_item")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    
    checkout_time = Column(DateTime, default=datetime.utcnow)
    expected_return = Column(DateTime)
    observacao = Column(String, nullable=True)
    destino = Column(String, nullable=True)
    checkin_time = Column(DateTime, nullable=True) # Preenchido só na devolução
    observacao_checkin = Column(String, nullable=True)

    item = relationship("Item")
    employee = relationship("Employee")
