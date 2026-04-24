from sqlalchemy import inspect, text

from .database import engine, SessionLocal


def _add_column_if_missing(connection, table: str, column: str, ddl: str, existing: set[str]):
    if column not in existing:
        connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


def ensure_schema():
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        if "transactions" in tables:
            existing = {c["name"] for c in inspector.get_columns("transactions")}
            _add_column_if_missing(connection, "transactions", "observacao", "VARCHAR", existing)
            _add_column_if_missing(connection, "transactions", "destino", "VARCHAR", existing)
            _add_column_if_missing(connection, "transactions", "observacao_checkin", "VARCHAR", existing)
            _add_column_if_missing(connection, "transactions", "batch_code", "VARCHAR", existing)
            _add_column_if_missing(connection, "transactions", "batch_root_item_id", "INTEGER", existing)

        if "items" in tables:
            existing = {c["name"] for c in inspector.get_columns("items")}
            _add_column_if_missing(connection, "items", "parent_item_id", "INTEGER", existing)
            _add_column_if_missing(connection, "items", "project_id", "INTEGER", existing)
            _add_column_if_missing(connection, "items", "product_code", "VARCHAR", existing)
            _add_column_if_missing(connection, "items", "purchase_code", "VARCHAR", existing)
            _add_column_if_missing(connection, "items", "purchase_info", "VARCHAR", existing)

        if "employees" in tables:
            existing = {c["name"] for c in inspector.get_columns("employees")}
            _add_column_if_missing(connection, "employees", "location_id", "INTEGER", existing)
            _add_column_if_missing(connection, "employees", "email", "VARCHAR", existing)
            _add_column_if_missing(connection, "employees", "password_hash", "VARCHAR", existing)
            _add_column_if_missing(connection, "employees", "is_admin", "BOOLEAN DEFAULT 0", existing)

        if "project_locations" in tables:
            existing = {c["name"] for c in inspector.get_columns("project_locations")}
            _add_column_if_missing(connection, "project_locations", "code", "VARCHAR", existing)


def backfill_location_codes():
    from .location_code import next_location_code
    from .database import SessionLocal
    from ..projects.domain.project import ProjectLocation, Project

    db = SessionLocal()
    try:
        locations_without_code = db.query(ProjectLocation).filter(
            ProjectLocation.code.is_(None)
        ).all()

        locations_by_project = {}
        for loc in locations_without_code:
            if loc.project_id not in locations_by_project:
                locations_by_project[loc.project_id] = []
            locations_by_project[loc.project_id].append(loc)

        for project_id, locs in locations_by_project.items():
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project or not project.code:
                continue

            for loc in locs:
                loc.code = next_location_code(db, project.code)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error backfilling location codes: {e}")
    finally:
        db.close()

