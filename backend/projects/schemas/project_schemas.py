from typing import Optional

from pydantic import BaseModel

from ..domain.project import Project, ProjectLocation, ProjectStatus


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


# ── Serializers ──────────────────────────────────────────────────────────────

def serialize_location(loc: ProjectLocation) -> dict:
    return {
        "id": loc.id,
        "project_id": loc.project_id,
        "name": loc.name,
        "description": loc.description,
        "code": loc.code,
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
        "item_count": len(project.items) if project.items else 0,
        "stock_count": len(project.stock_items) if project.stock_items else 0,
    }
