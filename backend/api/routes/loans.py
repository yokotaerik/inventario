from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ...api.auth import require_auth
from ...loans.use_cases.create_batch_loan import CreateBatchLoanUseCase
from ...loans.use_cases.create_loan import CreateLoanUseCase
from ...loans.use_cases.list_history import ListLoanHistoryUseCase
from ...loans.use_cases.return_batch import ReturnBatchUseCase
from ...loans.use_cases.return_loan import ReturnLoanUseCase
from ...shared.database import get_db
from ...workforce.domain.employee import Employee

# Mantém o prefixo legado `/transactions` pra não quebrar o frontend.
router = APIRouter(prefix="/transactions", tags=["loans"])


@router.post("/checkout", status_code=status.HTTP_201_CREATED)
def checkout_item(
    item_id: int,
    expected_return: Optional[datetime] = None,
    observacao: Optional[str] = None,
    destino: Optional[str] = None,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_auth),
):
    CreateLoanUseCase(db).execute(
        item_id=item_id,
        employee_id=current_employee.id,
        destino=destino,
        expected_return=expected_return,
        observacao=observacao,
    )
    return {"message": "Empréstimo realizado com sucesso"}


@router.post("/checkout/container", status_code=status.HTTP_201_CREATED)
def checkout_container_items(
    container_item_id: int,
    mode: str = "full_available",
    target_child_id: Optional[int] = None,
    expected_return: Optional[datetime] = None,
    observacao: Optional[str] = None,
    destino: Optional[str] = None,
    db: Session = Depends(get_db),
    current_employee: Employee = Depends(require_auth),
):
    return CreateBatchLoanUseCase(db).execute(
        container_item_id=container_item_id,
        employee_id=current_employee.id,
        destino=destino,
        mode=mode,
        target_child_id=target_child_id,
        expected_return=expected_return,
        observacao=observacao,
    )


@router.post("/checkin")
def checkin_item(
    item_id: int,
    observacao: Optional[str] = None,
    db: Session = Depends(get_db),
):
    message = ReturnLoanUseCase(db).execute(item_id=item_id, observacao=observacao)
    return {"message": message}


@router.post("/checkin/container")
def checkin_container_items(
    container_item_id: int,
    mode: str = "all_lent",
    target_item_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    observacao: Optional[str] = None,
    db: Session = Depends(get_db),
):
    return ReturnBatchUseCase(db).execute(
        container_item_id=container_item_id,
        mode=mode,
        target_item_id=target_item_id,
        employee_id=employee_id,
        observacao=observacao,
    )


@router.get("/history", response_model=None)
def get_loan_history(db: Session = Depends(get_db)):
    return ListLoanHistoryUseCase(db).execute()
