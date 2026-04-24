import random
import string
from sqlalchemy.orm import Session

from ..domain.project import Project
from ..repository.project_repository import ProjectRepository
from ..schemas.project_schemas import NewProjectRequest
from ...shared.exceptions import ConflictError


class CreateProjectUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def _generate_code(self) -> str:
        for _ in range(5):
            suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            code = f"70{suffix}"
            if not self.repo.get_by_code(code):
                return code
        raise ConflictError("Falha ao gerar código de projeto (colisão após 5 tentativas).")

    def execute(self, payload: NewProjectRequest) -> Project:
        code = payload.code
        if not code or not code.strip():
            code = self._generate_code()
        else:
            code = code.strip()
            existing = self.repo.get_by_code(code)
            if existing:
                raise ConflictError(f"Já existe um projeto com o código '{code}'.")

        project = Project(
            code=code,
            name=payload.name,
            description=payload.description,
            status=payload.status,
        )
        self.repo.create(project)
        self.db.commit()
        self.db.refresh(project)
        return project
