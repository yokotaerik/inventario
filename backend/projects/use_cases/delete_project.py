from sqlalchemy.orm import Session

from ..repository.project_repository import ProjectRepository
from ...shared.exceptions import NotFoundError, ValidationError


class DeleteProjectUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def execute(self, project_id: int) -> str:
        project = self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundError(f"Projeto #{project_id} não encontrado.")

        if project.stock_items and len(project.stock_items) > 0:
            raise ValidationError(
                f"Não é possível excluir o projeto '{project.name}' "
                f"pois ainda possui {len(project.stock_items)} item(ns) de estoque vinculado(s)."
            )

        self.repo.delete(project)
        self.db.commit()
        return f"Projeto '{project.name}' excluído com sucesso."
