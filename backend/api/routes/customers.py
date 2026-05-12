from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ...customers.repository.customer_repository import CustomerRepository
from ...customers.schemas.customer_schemas import (
    NewCustomerRequest,
    UpdateCustomerRequest,
    serialize_customer,
)
from ...customers.use_cases.create_customer import CreateCustomerUseCase
from ...customers.use_cases.delete_customer import DeleteCustomerUseCase
from ...customers.use_cases.list_customers import ListCustomersUseCase
from ...customers.use_cases.update_customer import UpdateCustomerUseCase
from ...shared.database import get_db
from ..auth import require_admin

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=None)
def list_customers(db: Session = Depends(get_db)):
    customers = ListCustomersUseCase(db).execute()
    customer_repo = CustomerRepository(db)
    result = []
    for customer in customers:
        project_count = len(customer.projects) if customer.projects else 0
        result.append(serialize_customer(customer, project_count))
    return result


@router.get("/{customer_id}", response_model=None)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    repo = CustomerRepository(db)
    customer = repo.get_by_id(customer_id)
    if not customer:
        return {"error": "Cliente não encontrado"}, 404
    project_count = len(customer.projects) if customer.projects else 0
    return serialize_customer(customer, project_count)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=None,
    dependencies=[Depends(require_admin)],
)
def create_customer(payload: NewCustomerRequest, db: Session = Depends(get_db)):
    customer = CreateCustomerUseCase(db).execute(payload)
    project_count = len(customer.projects) if customer.projects else 0
    return serialize_customer(customer, project_count)


@router.put("/{customer_id}", response_model=None, dependencies=[Depends(require_admin)])
def update_customer(customer_id: int, payload: UpdateCustomerRequest, db: Session = Depends(get_db)):
    customer = UpdateCustomerUseCase(db).execute(customer_id, payload)
    project_count = len(customer.projects) if customer.projects else 0
    return serialize_customer(customer, project_count)


@router.delete("/{customer_id}", response_model=None, dependencies=[Depends(require_admin)])
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    message = DeleteCustomerUseCase(db).execute(customer_id)
    return {"message": message}


@router.get("/{customer_id}/projects", response_model=None)
def get_customer_projects(customer_id: int, db: Session = Depends(get_db)):
    from ...projects.repository.project_repository import ProjectRepository
    from ...projects.schemas.project_schemas import serialize_project

    customer_repo = CustomerRepository(db)
    customer = customer_repo.get_by_id(customer_id)
    if not customer:
        return {"error": "Cliente não encontrado"}, 404

    project_repo = ProjectRepository(db)
    projects = project_repo.list_by_customer(customer_id)

    result = []
    for project in projects:
        stock_count = len(project.stock_items) if project.stock_items else 0
        locations = [
            {
                "id": loc.id,
                "project_id": loc.project_id,
                "name": loc.name,
                "description": loc.description,
                "code": loc.code,
            }
            for loc in (project.locations or [])
        ]
        result.append(serialize_project(project, stock_count, locations))

    return result
