from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ...projects.repository.project_repository import ProjectRepository
from ...projects.schemas.project_schemas import (
    NewProjectRequest,
    UpdateProjectRequest,
    NewAnyDeskRequest,
    UpdateAnyDeskRequest,
    serialize_project,
    serialize_anydesk_entry,
)
from ...projects.use_cases.create_project import CreateProjectUseCase
from ...projects.use_cases.update_project import UpdateProjectUseCase
from ...projects.use_cases.delete_project import DeleteProjectUseCase
from ...projects.use_cases.list_projects import ListProjectsUseCase
from ...projects.use_cases.create_anydesk import CreateAnyDeskEntryUseCase
from ...projects.use_cases.update_anydesk import UpdateAnyDeskEntryUseCase
from ...projects.use_cases.delete_anydesk import DeleteAnyDeskEntryUseCase
from ...shared.database import get_db
from ..auth import require_admin

router = APIRouter(prefix="/projects", tags=["projects"])


# ── Projects ─────────────────────────────────────────────────────────────────

@router.get("", response_model=None)
def list_projects(db: Session = Depends(get_db)):
    """Lista todos os projetos (público — para preencher selects)."""
    projects = ListProjectsUseCase(db).execute()
    result = []
    for p in projects:
        stock_count = len(p.stock_items) if p.stock_items else 0
        result.append(serialize_project(p, stock_count))
    return result


@router.get("/{project_id}", response_model=None)
def get_project(project_id: int, db: Session = Depends(get_db)):
    from ...shared.exceptions import NotFoundError
    repo = ProjectRepository(db)
    project = repo.get_by_id(project_id)
    if not project:
        raise NotFoundError(f"Projeto #{project_id} não encontrado.")
    stock_count = len(project.stock_items) if project.stock_items else 0
    return serialize_project(project, stock_count)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=None,
    dependencies=[Depends(require_admin)],
)
def create_project(payload: NewProjectRequest, db: Session = Depends(get_db)):
    project = CreateProjectUseCase(db).execute(payload)
    stock_count = len(project.stock_items) if project.stock_items else 0
    return serialize_project(project, stock_count)


@router.put("/{project_id}", response_model=None, dependencies=[Depends(require_admin)])
def update_project(project_id: int, payload: UpdateProjectRequest, db: Session = Depends(get_db)):
    project = UpdateProjectUseCase(db).execute(project_id, payload)
    stock_count = len(project.stock_items) if project.stock_items else 0
    return serialize_project(project, stock_count)


@router.delete("/{project_id}", response_model=None, dependencies=[Depends(require_admin)])
def delete_project(project_id: int, db: Session = Depends(get_db)):
    message = DeleteProjectUseCase(db).execute(project_id)
    return {"message": message}





# ── AnyDesk ───────────────────────────────────────────────────────────────────

@router.get("/{project_id}/anydesk", response_model=None)
def list_anydesk_entries(project_id: int, db: Session = Depends(get_db)):
    repo = ProjectRepository(db)
    entries = repo.list_anydesk_entries(project_id)
    return [serialize_anydesk_entry(e) for e in entries]


@router.post(
    "/{project_id}/anydesk",
    status_code=status.HTTP_201_CREATED,
    response_model=None,
    dependencies=[Depends(require_admin)],
)
def create_anydesk_entry(project_id: int, payload: NewAnyDeskRequest, db: Session = Depends(get_db)):
    entry = CreateAnyDeskEntryUseCase(db).execute(project_id, payload)
    return serialize_anydesk_entry(entry)


@router.put("/anydesk/{entry_id}", response_model=None, dependencies=[Depends(require_admin)])
def update_anydesk_entry(entry_id: int, payload: UpdateAnyDeskRequest, db: Session = Depends(get_db)):
    entry = UpdateAnyDeskEntryUseCase(db).execute(entry_id, payload)
    return serialize_anydesk_entry(entry)


@router.delete("/anydesk/{entry_id}", response_model=None, dependencies=[Depends(require_admin)])
def delete_anydesk_entry(entry_id: int, db: Session = Depends(get_db)):
    message = DeleteAnyDeskEntryUseCase(db).execute(entry_id)
    return {"message": message}
