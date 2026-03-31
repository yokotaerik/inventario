from sqlalchemy.orm import Session
from .database import SessionLocal, engine
from . import models

# Cria as tabelas se não existirem
models.Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    
    # 1. Adicionar Funcionários de Teste
    employees = [
        models.Employee(name="Nikolas", department="Operacional"),
        models.Employee(name="Hamuilton", department="Operacional"),
        models.Employee(name="Adriano", department="Operacional"),
        models.Employee(name="Erik", department="Operacional"),
        models.Employee(name="Polania", department="Operacional"),
        models.Employee(name="Renan", department="Operacional"),
    ]
    
    # 2. Adicionar Itens de Teste com estrutura pai/filho (multiitens)
    # Em um sistema real, esses hashes seriam UUIDs ou códigos únicos.
    maleta_1 = models.Item(
        name="Maleta Principal",
        category="Kit Audiovisual",
        qr_code_hash="KIT-001",
        status=models.ItemStatus.AVAILABLE,
    )

    items = [
        maleta_1,
        models.Item(name="Câmera 1", category="Kit Audiovisual", qr_code_hash="CAM-001", status=models.ItemStatus.AVAILABLE, parent_item=maleta_1),
        models.Item(name="Câmera 2", category="Kit Audiovisual", qr_code_hash="CAM-002", status=models.ItemStatus.AVAILABLE, parent_item=maleta_1),
        models.Item(name="Câmera 3", category="Kit Audiovisual", qr_code_hash="CAM-003", status=models.ItemStatus.AVAILABLE, parent_item=maleta_1),
        models.Item(name="Tripé", category="Kit Audiovisual", qr_code_hash="TRI-001", status=models.ItemStatus.AVAILABLE, parent_item=maleta_1),
        models.Item(name="Notebook", category="TI", qr_code_hash="NOT-001", status=models.ItemStatus.AVAILABLE),
    ]

    try:
        # Limpa dados antigos para não duplicar no SQLite
        db.query(models.Transaction).delete()
        db.query(models.Employee).delete()
        db.query(models.Item).delete()
        
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
