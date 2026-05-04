from sqlalchemy.orm import Session

from ..domain.project import AnyDeskEntry
from ..repository.project_repository import ProjectRepository
from ..schemas.project_schemas import NewAnyDeskRequest
from ...shared.exceptions import NotFoundError


class CreateAnyDeskEntryUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def execute(self, project_id: int, payload: NewAnyDeskRequest) -> AnyDeskEntry:
        project = self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundError(f"Projeto #{project_id} não encontrado.")

        entry = AnyDeskEntry(
            project_id=project_id,
            machine_name=payload.machine_name,
            anydesk_id=payload.anydesk_id,
            password=payload.password,
            description=payload.description,
        )
        self.repo.create_anydesk_entry(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry
