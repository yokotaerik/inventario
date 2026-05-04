"""
Seed mínimo: limpa todas as tabelas e cria apenas o usuário admin.
As credenciais são lidas das variáveis de ambiente (mesmas do bootstrap).

Uso:
    python -m backend.seed
"""
import os

from .inventory.domain.item import Item
from .loans.domain.loan import Loan
from .projects.domain.project import Project, AnyDeskEntry
from .shared.database import Base, SessionLocal, engine
from .shared.security import hash_password
from .stock.domain.stock_item import StockItem
from .workforce.domain.employee import Employee

Base.metadata.create_all(bind=engine)


def seed_data():
    db = SessionLocal()
    try:
        db.query(Loan).delete()
        db.query(AnyDeskEntry).delete()
        db.query(StockItem).delete()
        db.query(Item).delete()
        db.query(Employee).delete()
        db.query(Project).delete()
        db.commit()

        admin_email = os.getenv("INVENTORY_ADMIN_EMAIL", "admin@autaza.local")
        admin_password = os.getenv("INVENTORY_ADMIN_PASSWORD", "admin123")

        admin = Employee(
            name="Admin",
            department="Admin",
            email=admin_email,
            password_hash=hash_password(admin_password),
            is_admin=True,
        )
        db.add(admin)
        db.commit()

        print(f"Seed concluído. Admin criado: {admin_email}")
    except Exception as e:
        db.rollback()
        print(f"Erro no seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
