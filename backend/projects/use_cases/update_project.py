from sqlalchemy.orm import Session

from ..domain.project import Project
from ..repository.project_repository import ProjectRepository
from ..schemas.project_schemas import UpdateProjectRequest
from ...shared.exceptions import NotFoundError, ConflictError


class UpdateProjectUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def execute(self, project_id: int, payload: UpdateProjectRequest) -> Project:
        project = self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundError(f"Projeto #{project_id} não encontrado.")

        # Check code uniqueness (if changed)
        if payload.code != project.code:
            existing = self.repo.get_by_code(payload.code)
            if existing:
                raise ConflictError(f"Já existe um projeto com o código '{payload.code}'.")

        project.code = payload.code
        project.name = payload.name
        project.description = payload.description
        project.status = payload.status
        self.db.commit()
        self.db.refresh(project)
        return project
