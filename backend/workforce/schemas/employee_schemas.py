from typing import Optional

from pydantic import BaseModel


class NewEmployeeRequest(BaseModel):
    name: str
    department: Optional[str] = None
    is_active: bool = True
    location_id: Optional[int] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_admin: bool = False


class UpdateEmployeeRequest(BaseModel):
    name: str
    department: Optional[str] = None
    is_active: bool
    location_id: Optional[int] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_admin: bool = False


def serialize_employee(emp) -> dict:
    return {
        "id": emp.id,
        "name": emp.name,
        "department": emp.department,
        "is_active": emp.is_active,
        "location_id": emp.location_id,
        "location_name": emp.location.name if emp.location else None,
        "project_name": emp.location.project.name if emp.location and emp.location.project else None,
        "email": emp.email,
        "is_admin": emp.is_admin,
    }
