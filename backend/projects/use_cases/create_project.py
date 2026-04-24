from sqlalchemy.orm import Session

from ..domain.project import Project
from ..repository.project_repository import ProjectRepository
from ..schemas.project_schemas import NewProjectRequest
from ...shared.exceptions import ConflictError


class CreateProjectUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def execute(self, payload: NewProjectRequest) -> Project:
        existing = self.repo.get_by_code(payload.code)
        if existing:
            raise ConflictError(f"Já existe um projeto com o código '{payload.code}'.")

        project = Project(
            code=payload.code,
            name=payload.name,
            description=payload.description,
            status=payload.status,
        )
        self.repo.create(project)
        self.db.commit()
        self.db.refresh(project)
        return project
