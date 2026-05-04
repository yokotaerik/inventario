from typing import Optional

from pydantic import BaseModel

from ..domain.project import Project, ProjectLocation, ProjectStatus, AnyDeskEntry


# ── Request schemas ──────────────────────────────────────────────────────────

class NewProjectRequest(BaseModel):
    code: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.ACTIVE


class UpdateProjectRequest(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    status: ProjectStatus


class NewLocationRequest(BaseModel):
    name: str
    description: Optional[str] = None


class UpdateLocationRequest(BaseModel):
    name: str
    description: Optional[str] = None


class NewAnyDeskRequest(BaseModel):
    machine_name: str
    anydesk_id: str
    password: Optional[str] = None
    description: Optional[str] = None


class UpdateAnyDeskRequest(BaseModel):
    machine_name: str
    anydesk_id: str
    password: Optional[str] = None
    description: Optional[str] = None


# ── Serializers ──────────────────────────────────────────────────────────────

def serialize_location(loc: ProjectLocation) -> dict:
    return {
        "id": loc.id,
        "project_id": loc.project_id,
        "name": loc.name,
        "description": loc.description,
        "code": loc.code,
    }


def serialize_anydesk_entry(entry: AnyDeskEntry) -> dict:
    return {
        "id": entry.id,
        "project_id": entry.project_id,
        "machine_name": entry.machine_name,
        "anydesk_id": entry.anydesk_id,
        "password": entry.password,
        "description": entry.description,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }


def serialize_project(project: Project) -> dict:
    return {
        "id": project.id,
        "code": project.code,
        "name": project.name,
        "description": project.description,
        "status": project.status.value,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "locations": [serialize_location(loc) for loc in (project.locations or [])],
        "stock_count": len(project.stock_items) if project.stock_items else 0,
    }
