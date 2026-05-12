from sqlalchemy.orm import Session

from ...shared.exceptions import ConflictError, NotFoundError
from ..repository.customer_repository import CustomerRepository


class DeleteCustomerUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CustomerRepository(db)

    def execute(self, customer_id: int) -> str:
        customer = self.repo.get_by_id(customer_id)
        if not customer:
            raise NotFoundError("Cliente não encontrado")

        if customer.projects and len(customer.projects) > 0:
            raise ConflictError("Não é possível deletar um cliente com projetos associados")

        self.repo.delete(customer)
        self.db.commit()
        return f"Cliente '{customer.name}' deletado com sucesso"
