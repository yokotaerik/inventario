from .inventory.domain.item import Item, ItemStatus
from .loans.domain.loan import Loan
from .projects.domain.project import Project
from .shared.database import Base, SessionLocal, engine
from .shared.product_code import next_product_code
from .stock.domain.stock_item import StockItem
from .workforce.domain.employee import Employee

Base.metadata.create_all(bind=engine)


def seed_data():
    db = SessionLocal()

    employees = [
        Employee(
            name="Nikolas",
            department="Operacional",
            email="nikolas@autaza.local",
            is_admin=True,
        ),
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
        db.query(StockItem).delete()
        db.query(Item).delete()
        db.query(Employee).delete()
        db.query(Project).delete()

        db.add_all(employees)
        db.add_all(items)
        db.commit()

        project = Project(
            code=None,
            name="Obra Centro - Exemplo",
            description=None,
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        from .projects.use_cases.create_project import CreateProjectUseCase
        use_case = CreateProjectUseCase(db)
        project_code = use_case._generate_code()
        project.code = project_code
        db.commit()

        notebook = db.query(Item).filter(Item.name == "Notebook").first()
        if notebook:
            notebook.project_id = project.id
            db.commit()

        stock_code_1 = next_product_code(db, project.code)
        stock_code_2 = next_product_code(db, project.code)

        stock_items = [
            StockItem(
                name="Parafuso Phillips 3mm",
                category="Materiais",
                quantity=250,
                product_code=stock_code_1,
                project_id=project.id,
            ),
            StockItem(
                name="RTX 5060",
                category="TI",
                quantity=5,
                product_code=stock_code_2,
                project_id=project.id,
            ),
        ]
        db.add_all(stock_items)
        db.commit()

        print("Banco de dados populado com sucesso!")
    except Exception as e:
        db.rollback()
        print(f"Erro ao popular banco: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
