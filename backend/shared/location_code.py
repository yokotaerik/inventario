from sqlalchemy.orm import Session


def next_location_code(db: Session, project_code: str) -> str:
    from ..projects.domain.project import ProjectLocation

    prefix = f"{project_code}-L"
    locations = db.query(ProjectLocation.code).filter(
        ProjectLocation.code.isnot(None),
        ProjectLocation.code.startswith(prefix),
    ).all()

    max_suffix = 0
    for (code,) in locations:
        if code and code.startswith(prefix):
            try:
                suffix = int(code[len(prefix):])
                max_suffix = max(max_suffix, suffix)
            except (ValueError, IndexError):
                pass

    return f"{project_code}-L{(max_suffix + 1):02d}"
