from typing import Optional

from sqlalchemy.orm import Session

from ..domain.session import Session as SessionModel


class SessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, token: str, employee_id: int) -> SessionModel:
        session = SessionModel(token=token, employee_id=employee_id)
        self.db.add(session)
        self.db.flush()
        return session

    def get_by_token(self, token: str) -> Optional[SessionModel]:
        return self.db.query(SessionModel).filter(SessionModel.token == token).first()

    def delete_by_token(self, token: str) -> None:
        session = self.get_by_token(token)
        if session:
            self.db.delete(session)

    def delete_for_employee(self, employee_id: int) -> None:
        self.db.query(SessionModel).filter(SessionModel.employee_id == employee_id).delete()
