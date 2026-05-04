from sqlalchemy.orm import Session

from ..repository.project_repository import ProjectRepository
from ...shared.exceptions import NotFoundError


class DeleteAnyDeskEntryUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def execute(self, entry_id: int) -> str:
        entry = self.repo.get_anydesk_entry_by_id(entry_id)
        if not entry:
            raise NotFoundError(f"Entrada AnyDesk #{entry_id} não encontrada.")

        self.repo.delete_anydesk_entry(entry)
        self.db.commit()
        return "Entrada AnyDesk excluída com sucesso."
