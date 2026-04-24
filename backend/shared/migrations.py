from sqlalchemy import inspect, text

from .database import engine


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
            _add_column_if_missing(connection, "items", "purchase_code", "VARCHAR", existing)
            _add_column_if_missing(connection, "items", "purchase_info", "VARCHAR", existing)

        if "employees" in tables:
            existing = {c["name"] for c in inspector.get_columns("employees")}
            _add_column_if_missing(connection, "employees", "location_id", "INTEGER", existing)

