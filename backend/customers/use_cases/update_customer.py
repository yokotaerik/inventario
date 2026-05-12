from sqlalchemy.orm import Session

from ...shared.exceptions import ConflictError, NotFoundError
from ..repository.customer_repository import CustomerRepository
from ..schemas.customer_schemas import UpdateCustomerRequest


class UpdateCustomerUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CustomerRepository(db)

    def execute(self, customer_id: int, payload: UpdateCustomerRequest):
        customer = self.repo.get_by_id(customer_id)
        if not customer:
            raise NotFoundError("Cliente não encontrado")

        if payload.code and payload.code != customer.code:
            if self.repo.get_by_code(payload.code):
                raise ConflictError(f"Já existe cliente com o código '{payload.code}'")

        self.repo.update(customer, **payload.dict(exclude_unset=True))
        self.db.commit()
        self.db.refresh(customer)
        return customer
