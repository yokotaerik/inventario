from typing import Optional
from pydantic import BaseModel

from ..domain.customer import CustomerStatus


class NewCustomerRequest(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class UpdateCustomerRequest(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CustomerStatus] = None


def serialize_customer(customer, project_count: int = 0) -> dict:
    return {
        "id": customer.id,
        "code": customer.code,
        "name": customer.name,
        "description": customer.description,
        "status": customer.status.value if customer.status else "active",
        "created_at": customer.created_at.isoformat() if customer.created_at else None,
        "project_count": project_count,
    }
