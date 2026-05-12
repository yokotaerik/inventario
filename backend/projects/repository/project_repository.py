from typing import Optional, List

from sqlalchemy.orm import Session

from ..domain.project import Project, AnyDeskEntry


class ProjectRepository:
    def __init__(self, db: Session):
        self.db = db

    # ── Project ────────────────────────────────────────────────────────────

    def list_all(self) -> List[Project]:
        return self.db.query(Project).order_by(Project.name).all()

    def list_by_customer(self, customer_id: int) -> List[Project]:
        return self.db.query(Project).filter(Project.customer_id == customer_id).order_by(Project.name).all()

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

    # ── AnyDesk ───────────────────────────────────────────────────────────────

    def list_anydesk_entries(self, project_id: int) -> List[AnyDeskEntry]:
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
