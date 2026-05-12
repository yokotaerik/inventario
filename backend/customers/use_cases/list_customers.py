from sqlalchemy.orm import Session

from ..repository.customer_repository import CustomerRepository


class ListCustomersUseCase:
    def __init__(self, db: Session):
        self.repo = CustomerRepository(db)

    def execute(self) -> list:
        return self.repo.list_all()
