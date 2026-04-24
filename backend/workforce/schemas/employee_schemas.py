from typing import Optional

from pydantic import BaseModel


class NewEmployeeRequest(BaseModel):
    name: str
    department: Optional[str] = None
    is_active: bool = True
    location_id: Optional[int] = None


class UpdateEmployeeRequest(BaseModel):
    name: str
    department: Optional[str] = None
    is_active: bool
    location_id: Optional[int] = None
