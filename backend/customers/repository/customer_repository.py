from typing import Optional, List
from sqlalchemy.orm import Session

from ..domain.customer import Customer


class CustomerRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> List[Customer]:
        return self.db.query(Customer).all()

    def get_by_id(self, customer_id: int) -> Optional[Customer]:
        return self.db.query(Customer).filter(Customer.id == customer_id).first()

    def get_by_code(self, code: str) -> Optional[Customer]:
        return self.db.query(Customer).filter(Customer.code == code).first()

    def create(self, code: str, name: str, description: Optional[str] = None) -> Customer:
        customer = Customer(code=code, name=name, description=description)
        self.db.add(customer)
        return customer

    def update(self, customer: Customer, **kwargs) -> Customer:
        for key, value in kwargs.items():
            if hasattr(customer, key) and value is not None:
                setattr(customer, key, value)
        return customer

    def delete(self, customer: Customer):
        self.db.delete(customer)
