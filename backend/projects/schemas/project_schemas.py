from typing import Optional

from pydantic import BaseModel

from ..domain.project import Project, ProjectStatus, AnyDeskEntry


# ── Request schemas ──────────────────────────────────────────────────────────

class NewProjectRequest(BaseModel):
    customer_id: int
    code: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.ACTIVE


class UpdateProjectRequest(BaseModel):
    customer_id: Optional[int] = None
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None





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


def serialize_project(project: Project, stock_count: Optional[int] = None) -> dict:
    if stock_count is None:
        stock_count = len(project.stock_items) if project.stock_items else 0

    customer = project.customer if project.customer else None
    return {
        "id": project.id,
        "code": project.code,
        "name": project.name,
        "description": project.description,
        "status": project.status.value,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "customer_id": project.customer_id,
        "customer_code": customer.code if customer else None,
        "customer_name": customer.name if customer else None,
        "stock_count": stock_count,
    }
