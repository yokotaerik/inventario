from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from ...shared.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    department = Column(String)
    is_active = Column(Boolean, default=True)
    location_id = Column(Integer, ForeignKey("project_locations.id"), nullable=True, index=True)

    location = relationship("ProjectLocation")
