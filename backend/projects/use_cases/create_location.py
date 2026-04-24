from sqlalchemy.orm import Session

from ..domain.project import ProjectLocation
from ..repository.project_repository import ProjectRepository
from ..schemas.project_schemas import NewLocationRequest
from ...shared.exceptions import NotFoundError
from ...shared.location_code import next_location_code


class CreateLocationUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def execute(self, project_id: int, payload: NewLocationRequest) -> ProjectLocation:
        project = self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundError(f"Projeto #{project_id} não encontrado.")

        location = ProjectLocation(
            project_id=project_id,
            name=payload.name,
            description=payload.description,
            code=next_location_code(self.db, project.code),
        )
        self.repo.create_location(location)
        self.db.commit()
        self.db.refresh(location)
        return location
