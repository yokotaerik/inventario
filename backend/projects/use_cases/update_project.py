from sqlalchemy.orm import Session

from ..domain.project import Project
from ..repository.project_repository import ProjectRepository
from ..schemas.project_schemas import UpdateProjectRequest
from ...shared.exceptions import NotFoundError, ConflictError
from ...customers.repository.customer_repository import CustomerRepository


class UpdateProjectUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def execute(self, project_id: int, payload: UpdateProjectRequest) -> Project:
        project = self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundError(f"Projeto #{project_id} não encontrado.")

        # Check code uniqueness (if changed)
        if payload.code and payload.code != project.code:
            existing = self.repo.get_by_code(payload.code)
            if existing:
                raise ConflictError(f"Já existe um projeto com o código '{payload.code}'.")
            project.code = payload.code

        # Validate customer exists (if changing)
        if payload.customer_id and payload.customer_id != project.customer_id:
            customer_repo = CustomerRepository(self.db)
            customer = customer_repo.get_by_id(payload.customer_id)
            if not customer:
                raise NotFoundError("Cliente não encontrado")
            project.customer_id = payload.customer_id

        if payload.name:
            project.name = payload.name
        if payload.description is not None:
            project.description = payload.description
        if payload.status:
            project.status = payload.status

        self.db.commit()
        self.db.refresh(project)
        return project
