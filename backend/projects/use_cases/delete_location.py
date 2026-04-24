from sqlalchemy.orm import Session

from ..repository.project_repository import ProjectRepository
from ...shared.exceptions import NotFoundError


class DeleteLocationUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def execute(self, location_id: int) -> str:
        location = self.repo.get_location_by_id(location_id)
        if not location:
            raise NotFoundError(f"Local #{location_id} não encontrado.")

        name = location.name
        self.repo.delete_location(location)
        self.db.commit()
        return f"Local '{name}' excluído com sucesso."
