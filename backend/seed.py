"""
Seed mínimo: limpa todas as tabelas e recria dados de teste.
As credenciais são lidas das variáveis de ambiente (mesmas do bootstrap).

Uso:
    python -m backend.seed
"""
import os

from .customers.domain.customer import Customer, CustomerStatus
from .inventory.domain.item import Item
from .loans.domain.loan import Loan
from .projects.domain.project import Project, AnyDeskEntry, ProjectStatus
from .shared.database import Base, SessionLocal, engine
from .shared.security import hash_password
from .stock.domain.stock_item import StockItem
from .workforce.domain.employee import Employee

Base.metadata.create_all(bind=engine)


def seed_data():
    db = SessionLocal()
    try:
        # Deleção na ordem correta (filhos antes dos pais)
        db.query(Loan).delete()
        db.query(AnyDeskEntry).delete()
        db.query(StockItem).delete()
        db.query(Item).delete()
        db.query(Employee).delete()
        db.query(Project).delete()
        db.query(Customer).delete()
        db.commit()

        # ── Clientes ──────────────────────────────────────────────────────────
        cliente_mc = Customer(
            code="MC001",
            name="MC Softwares",
            description="Cliente principal — empresa própria",
            status=CustomerStatus.ACTIVE,
        )
        cliente_alpha = Customer(
            code="ALPHA01",
            name="Alpha Sistemas",
            description="Cliente de médio porte",
            status=CustomerStatus.ACTIVE,
        )
        cliente_beta = Customer(
            code="BETA01",
            name="Beta Tech",
            description="Cliente inativo",
            status=CustomerStatus.INACTIVE,
        )
        db.add_all([cliente_mc, cliente_alpha, cliente_beta])
        db.flush()

        # ── Projetos ──────────────────────────────────────────────────────────
        proj_interno = Project(
            code="70INT1",
            name="Infraestrutura Interna",
            description="Projeto de uso interno da MC Softwares",
            status=ProjectStatus.ACTIVE,
            customer_id=cliente_mc.id,
        )
        proj_alpha = Project(
            code="70ALP1",
            name="Implantação Alpha",
            description="Implantação do sistema na Alpha Sistemas",
            status=ProjectStatus.ACTIVE,
            customer_id=cliente_alpha.id,
        )
        db.add_all([proj_interno, proj_alpha])
        db.flush()

        # ── Admin ─────────────────────────────────────────────────────────────
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

        print(f"Seed concluído.")
        print(f"  Admin: {admin_email}")
        print(f"  Clientes: {cliente_mc.code}, {cliente_alpha.code}, {cliente_beta.code}")
        print(f"  Projetos: {proj_interno.code}, {proj_alpha.code}")
    except Exception as e:
        db.rollback()
        print(f"Erro no seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
