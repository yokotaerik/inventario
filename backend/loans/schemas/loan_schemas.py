from typing import Optional

from ..domain.loan import Loan


def serialize_active_loan(loan: Optional[Loan]) -> Optional[dict]:
    if not loan:
        return None

    employee = loan.employee
    employee_payload = None
    if employee:
        employee_payload = {"id": employee.id, "name": employee.name}

    return {
        "id": loan.id,
        "employee": employee_payload,
    }
