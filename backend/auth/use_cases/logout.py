from sqlalchemy.orm import Session

from ..repository.session_repository import SessionRepository


class LogoutUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.session_repo = SessionRepository(db)

    def execute(self, token: str) -> None:
        self.session_repo.delete_by_token(token)
        self.db.commit()
