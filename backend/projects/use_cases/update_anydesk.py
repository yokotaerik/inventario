from sqlalchemy.orm import Session

from ..domain.project import AnyDeskEntry
from ..repository.project_repository import ProjectRepository
from ..schemas.project_schemas import UpdateAnyDeskRequest
from ...shared.exceptions import NotFoundError


class UpdateAnyDeskEntryUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def execute(self, entry_id: int, payload: UpdateAnyDeskRequest) -> AnyDeskEntry:
        entry = self.repo.get_anydesk_entry_by_id(entry_id)
        if not entry:
            raise NotFoundError(f"Entrada AnyDesk #{entry_id} não encontrada.")

        entry.machine_name = payload.machine_name
        entry.anydesk_id = payload.anydesk_id
        entry.password = payload.password
        entry.description = payload.description
        self.db.commit()
        self.db.refresh(entry)
        return entry
