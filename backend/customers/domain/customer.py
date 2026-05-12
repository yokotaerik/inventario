from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.orm import relationship

from ...shared.database import Base
import enum


class CustomerStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    COMPLETED = "completed"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(Enum(CustomerStatus), default=CustomerStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="customer", cascade="all, delete-orphan")
