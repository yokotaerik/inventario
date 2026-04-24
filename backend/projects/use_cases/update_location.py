from sqlalchemy.orm import Session

from ..repository.project_repository import ProjectRepository
from ..schemas.project_schemas import UpdateLocationRequest
from ...shared.exceptions import NotFoundError


class UpdateLocationUseCase:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProjectRepository(db)

    def execute(self, location_id: int, payload: UpdateLocationRequest):
        location = self.repo.get_location_by_id(location_id)
        if not location:
            raise NotFoundError(f"Local #{location_id} não encontrado.")

        location.name = payload.name
        location.description = payload.description
        self.db.commit()
        self.db.refresh(location)
        return location
