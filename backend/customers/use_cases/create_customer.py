from typing import Optional
from sqlalchemy.orm import Session

from ...shared.exceptions import ConflictError
from ..domain.customer import Customer
from ..repository.customer_repository import CustomerRepository
from ..schemas.customer_schemas import NewCustomerRequest


class CreateCustomerUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CustomerRepository(db)

    def execute(self, payload: NewCustomerRequest) -> Customer:
        if self.repo.get_by_code(payload.code):
            raise ConflictError(f"Já existe cliente com o código '{payload.code}'")

        customer = self.repo.create(
            code=payload.code,
            name=payload.name,
            description=payload.description,
        )
        self.db.commit()
        self.db.refresh(customer)
        return customer
