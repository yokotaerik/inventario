from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ...shared.database import get_db
from ...workforce.schemas.employee_schemas import NewEmployeeRequest, UpdateEmployeeRequest
from ...workforce.use_cases.create_employee import CreateEmployeeUseCase
from ...workforce.use_cases.delete_employee import DeleteEmployeeUseCase
from ...workforce.use_cases.list_employees import (
    ListActiveEmployeesUseCase,
    ListEmployeesUseCase,
)
from ...workforce.use_cases.update_employee import UpdateEmployeeUseCase
from ..auth import require_admin

router = APIRouter(prefix="/employees", tags=["employees"])


def _serialize_employee(emp) -> dict:
    loc = emp.location
    return {
        "id": emp.id,
        "name": emp.name,
        "department": emp.department,
        "is_active": emp.is_active,
        "location_id": emp.location_id,
        "location_name": loc.name if loc else None,
        "project_name": loc.project.name if loc and loc.project else None,
    }


@router.get("/active", response_model=None)
def list_active_employees(db: Session = Depends(get_db)):
    employees = ListActiveEmployeesUseCase(db).execute()
    return [_serialize_employee(e) for e in employees]


@router.get("", response_model=None, dependencies=[Depends(require_admin)])
def list_employees(db: Session = Depends(get_db)):
    employees = ListEmployeesUseCase(db).execute()
    return [_serialize_employee(e) for e in employees]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=None,
    dependencies=[Depends(require_admin)],
)
def create_employee(payload: NewEmployeeRequest, db: Session = Depends(get_db)):
    emp = CreateEmployeeUseCase(db).execute(payload)
    return _serialize_employee(emp)


@router.put("/{employee_id}", response_model=None, dependencies=[Depends(require_admin)])
def update_employee(
    employee_id: int,
    payload: UpdateEmployeeRequest,
    db: Session = Depends(get_db),
):
    emp = UpdateEmployeeUseCase(db).execute(employee_id, payload)
    return _serialize_employee(emp)


@router.delete("/{employee_id}", response_model=None, dependencies=[Depends(require_admin)])
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    message = DeleteEmployeeUseCase(db).execute(employee_id)
    return {"message": message}

