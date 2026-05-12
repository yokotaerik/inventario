from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from ...shared.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    department = Column(String)
    is_active = Column(Boolean, default=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    email = Column(String, unique=True, nullable=True, index=True)
    password_hash = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)

    project = relationship("Project")
