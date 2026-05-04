import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from ...shared.database import Base



class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    COMPLETED = "completed"


class Project(Base):
    """
    Projeto — agrupa itens, locais e funcionários.
    Cada projeto tem um código único e pode ter vários locais.
    """

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)

    locations = relationship("ProjectLocation", back_populates="project", cascade="all, delete-orphan")
    stock_items = relationship("StockItem", back_populates="project")
    anydesk_entries = relationship("AnyDeskEntry", back_populates="project", cascade="all, delete-orphan")


class ProjectLocation(Base):
    """
    Local físico dentro de um projeto.
    Itens e funcionários podem estar alocados a um local específico.
    """

    __tablename__ = "project_locations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    code = Column(String, unique=True, nullable=True, index=True)

    project = relationship("Project", back_populates="locations")
    stock_items = relationship("StockItem", back_populates="location")


class AnyDeskEntry(Base):
    """Registro de acesso AnyDesk associado a um projeto."""

    __tablename__ = "anydesk_entries"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    machine_name = Column(String, nullable=False)
    anydesk_id = Column(String, nullable=False)
    password = Column(String, nullable=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="anydesk_entries")
