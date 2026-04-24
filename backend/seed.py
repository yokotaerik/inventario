from .inventory.domain.item import Item, ItemStatus
from .loans.domain.loan import Loan
from .shared.database import Base, SessionLocal, engine
from .workforce.domain.employee import Employee

Base.metadata.create_all(bind=engine)


def seed_data():
    db = SessionLocal()

    employees = [
        Employee(name="Nikolas", department="Operacional"),
        Employee(name="Hamuilton", department="Operacional"),
        Employee(name="Adriano", department="Operacional"),
        Employee(name="Erik", department="Operacional"),
        Employee(name="Polania", department="Operacional"),
        Employee(name="Renan", department="Operacional"),
    ]

    maleta_1 = Item(
        name="Maleta Principal",
        category="Kit Audiovisual",
        qr_code_hash="KIT-001",
        status=ItemStatus.AVAILABLE,
    )

    items = [
        maleta_1,
        Item(name="Câmera 1", category="Kit Audiovisual", qr_code_hash="CAM-001", status=ItemStatus.AVAILABLE, parent_item=maleta_1),
        Item(name="Câmera 2", category="Kit Audiovisual", qr_code_hash="CAM-002", status=ItemStatus.AVAILABLE, parent_item=maleta_1),
        Item(name="Câmera 3", category="Kit Audiovisual", qr_code_hash="CAM-003", status=ItemStatus.AVAILABLE, parent_item=maleta_1),
        Item(name="Tripé", category="Kit Audiovisual", qr_code_hash="TRI-001", status=ItemStatus.AVAILABLE, parent_item=maleta_1),
        Item(name="Notebook", category="TI", qr_code_hash="NOT-001", status=ItemStatus.AVAILABLE),
    ]

    try:
        db.query(Loan).delete()
        db.query(Employee).delete()
        db.query(Item).delete()

        db.add_all(employees)
        db.add_all(items)
        db.commit()
        print("✅ Banco de dados populado com sucesso!")
    except Exception as e:
        db.rollback()
        print(f"❌ Erro ao popular banco: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
