from sqlalchemy import inspect, text

from .database import engine, SessionLocal


def _add_column_if_missing(connection, table: str, column: str, ddl: str, existing: set[str]):
    if column not in existing:
        connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


def ensure_schema():
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        # Create customers table if it doesn't exist
        if "customers" not in tables:
            connection.execute(text("""
                CREATE TABLE customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    code VARCHAR(50) NOT NULL UNIQUE,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    status VARCHAR(50) DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))

        # Add customer_id column to projects if it doesn't exist
        if "projects" in tables:
            existing = {c["name"] for c in inspector.get_columns("projects")}
            if "customer_id" not in existing:
                # First, create a default customer if one doesn't exist
                default_customer = connection.execute(
                    text("SELECT id FROM customers WHERE code = 'DEFAULT' LIMIT 1")
                ).fetchone()
                if not default_customer:
                    connection.execute(text(
                        "INSERT INTO customers (code, name, description, status) VALUES ('DEFAULT', 'Padrão', 'Cliente padrão para projetos legados', 'active')"
                    ))

                # Now add the customer_id column with DEFAULT pointing to the DEFAULT customer
                _add_column_if_missing(connection, "projects", "customer_id", "INTEGER NOT NULL DEFAULT 1", existing)

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
            _add_column_if_missing(connection, "employees", "project_id", "INTEGER", existing)
            _add_column_if_missing(connection, "employees", "email", "VARCHAR", existing)
            _add_column_if_missing(connection, "employees", "password_hash", "VARCHAR", existing)
            _add_column_if_missing(connection, "employees", "is_admin", "BOOLEAN DEFAULT 0", existing)
