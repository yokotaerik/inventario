from typing import Optional

from pydantic import BaseModel


class NewEmployeeRequest(BaseModel):
    name: str
    department: Optional[str] = None
    is_active: bool = True
    project_id: Optional[int] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_admin: bool = False


class UpdateEmployeeRequest(BaseModel):
    name: str
    department: Optional[str] = None
    is_active: bool
    project_id: Optional[int] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_admin: bool = False


def serialize_employee(emp) -> dict:
    return {
        "id": emp.id,
        "name": emp.name,
        "department": emp.department,
        "is_active": emp.is_active,
        "project_id": emp.project_id,
        "project_name": emp.project.name if emp.project else None,
        "email": emp.email,
        "is_admin": emp.is_admin,
    }
