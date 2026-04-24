from sqlalchemy.orm import Session

from ..domain.project import Project
from ..repository.project_repository import ProjectRepository


class ListProjectsUseCase:
    def __init__(self, db: Session):
        self.repo = ProjectRepository(db)

    def execute(self) -> list[Project]:
        return self.repo.list_all()
