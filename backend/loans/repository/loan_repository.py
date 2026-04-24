from typing import Optional

from sqlalchemy.orm import Session

from ..domain.loan import Loan


class LoanRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, loan_id: int) -> Optional[Loan]:
        return self.db.query(Loan).filter(Loan.id == loan_id).first()

    def get_active_by_item_id(self, item_id: int) -> Optional[Loan]:
        return (
            self.db.query(Loan)
            .filter(Loan.item_id == item_id, Loan.checkin_time.is_(None))
            .first()
        )

    def list_active(self) -> list[Loan]:
        return self.db.query(Loan).filter(Loan.checkin_time.is_(None)).all()

    def list_active_by_item_ids(self, item_ids: list[int]) -> list[Loan]:
        if not item_ids:
            return []
        return (
            self.db.query(Loan)
            .filter(Loan.item_id.in_(item_ids), Loan.checkin_time.is_(None))
            .all()
        )

    def active_map_by_item_ids(self, item_ids: list[int]) -> dict[int, Loan]:
        loans = self.list_active_by_item_ids(item_ids)
        for loan in loans:
            _ = loan.employee  # força carregamento eager
        return {loan.item_id: loan for loan in loans}

    def list_history(self, limit: int = 200) -> list[Loan]:
        return (
            self.db.query(Loan)
            .order_by(Loan.checkout_time.desc())
            .limit(limit)
            .all()
        )

    def has_any_for_employee(self, employee_id: int) -> bool:
        return (
            self.db.query(Loan.id).filter(Loan.employee_id == employee_id).first()
            is not None
        )

    def add(self, loan: Loan) -> None:
        self.db.add(loan)

    def delete_by_item_id(self, item_id: int) -> None:
        self.db.query(Loan).filter(Loan.item_id == item_id).delete(synchronize_session=False)

    def delete_by_item_ids(self, item_ids: list[int]) -> None:
        if not item_ids:
            return
        self.db.query(Loan).filter(Loan.item_id.in_(item_ids)).delete(synchronize_session=False)
