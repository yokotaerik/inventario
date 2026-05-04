from typing import Optional

from sqlalchemy.orm import Session

from ..domain.project import Project, ProjectLocation, AnyDeskEntry


class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    # ── Project ────────────────────────────────────────────────────────────

    def list_all(self) -> list[Project]:
        return self.db.query(Project).order_by(Project.name).all()

    def get_by_id(self, project_id: int) -> Optional[Project]:
        return self.db.query(Project).filter(Project.id == project_id).first()

    def get_by_code(self, code: str) -> Optional[Project]:
        return self.db.query(Project).filter(Project.code == code).first()

    def create(self, project: Project) -> Project:
        self.db.add(project)
        self.db.flush()
        return project

    def delete(self, project: Project) -> None:
        self.db.delete(project)

    # ── Location ───────────────────────────────────────────────────────────

    def list_locations(self, project_id: int) -> list[ProjectLocation]:
        return (
            self.db.query(ProjectLocation)
            .filter(ProjectLocation.project_id == project_id)
            .order_by(ProjectLocation.name)
            .all()
        )

    def list_all_locations(self) -> list[ProjectLocation]:
        return self.db.query(ProjectLocation).order_by(ProjectLocation.name).all()

    def get_location_by_id(self, location_id: int) -> Optional[ProjectLocation]:
        return self.db.query(ProjectLocation).filter(ProjectLocation.id == location_id).first()

    def create_location(self, location: ProjectLocation) -> ProjectLocation:
        self.db.add(location)
        self.db.flush()
        return location

    def delete_location(self, location: ProjectLocation) -> None:
        self.db.delete(location)

    # ── AnyDesk ───────────────────────────────────────────────────────────────

    def list_anydesk_entries(self, project_id: int) -> list[AnyDeskEntry]:
        return (
            self.db.query(AnyDeskEntry)
            .filter(AnyDeskEntry.project_id == project_id)
            .order_by(AnyDeskEntry.machine_name)
            .all()
        )

    def get_anydesk_entry_by_id(self, entry_id: int) -> Optional[AnyDeskEntry]:
        return self.db.query(AnyDeskEntry).filter(AnyDeskEntry.id == entry_id).first()

    def create_anydesk_entry(self, entry: AnyDeskEntry) -> AnyDeskEntry:
        self.db.add(entry)
        self.db.flush()
        return entry

    def delete_anydesk_entry(self, entry: AnyDeskEntry) -> None:
        self.db.delete(entry)
