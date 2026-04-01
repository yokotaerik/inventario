import os
import secrets
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from . import models, database

# Cria as tabelas se não existirem
models.Base.metadata.create_all(bind=database.engine)


def ensure_transaction_columns():
    inspector = inspect(database.engine)
    if "transactions" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("transactions")}

    with database.engine.begin() as connection:
        if "observacao" not in existing_columns:
            connection.execute(text("ALTER TABLE transactions ADD COLUMN observacao VARCHAR"))
        if "destino" not in existing_columns:
            connection.execute(text("ALTER TABLE transactions ADD COLUMN destino VARCHAR"))
        if "observacao_checkin" not in existing_columns:
            connection.execute(text("ALTER TABLE transactions ADD COLUMN observacao_checkin VARCHAR"))


def ensure_item_columns():
    inspector = inspect(database.engine)
    if "items" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("items")}

    with database.engine.begin() as connection:
        if "parent_item_id" not in existing_columns:
            connection.execute(text("ALTER TABLE items ADD COLUMN parent_item_id INTEGER"))


ensure_item_columns()
ensure_transaction_columns()

app = FastAPI(title="Inventory QR Control API")

ADMIN_USERNAME = os.getenv("INVENTORY_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("INVENTORY_ADMIN_PASSWORD", "admin123")
ADMIN_TOKEN = os.getenv("INVENTORY_ADMIN_TOKEN", "inventory-admin-token")

auth_scheme = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    username: str
    password: str


class NewItemRequest(BaseModel):
    name: str
    category: str
    qr_code_hash: str
    status: models.ItemStatus = models.ItemStatus.AVAILABLE
    parent_item_id: Optional[int] = None


class UpdateItemRequest(BaseModel):
    name: str
    category: str
    qr_code_hash: str
    status: models.ItemStatus
    parent_item_id: Optional[int] = None


class NewEmployeeRequest(BaseModel):
    name: str
    department: Optional[str] = None
    is_active: bool = True


class UpdateEmployeeRequest(BaseModel):
    name: str
    department: Optional[str] = None
    is_active: bool


def serialize_item(item: models.Item, parent_name_by_id: dict[int, str], child_count_by_parent: dict[int, int]):
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "qr_code_hash": item.qr_code_hash,
        "status": item.status.value,
        "parent_item_id": item.parent_item_id,
        "parent_item_name": parent_name_by_id.get(item.parent_item_id),
        "has_sub_items": child_count_by_parent.get(item.id, 0) > 0,
    }


def build_item_relationship_maps(items: list[models.Item]):
    parent_name_by_id = {item.id: item.name for item in items}
    child_count_by_parent = {}

    for item in items:
        if item.parent_item_id is None:
            continue
        child_count_by_parent[item.parent_item_id] = child_count_by_parent.get(item.parent_item_id, 0) + 1

    return parent_name_by_id, child_count_by_parent


def validate_parent_assignment(db: Session, item_id: int, parent_item_id: Optional[int]):
    if parent_item_id is None:
        return

    if parent_item_id == item_id:
        raise HTTPException(status_code=400, detail="Um item não pode ser pai dele mesmo")

    parent_item = db.query(models.Item).filter(models.Item.id == parent_item_id).first()
    if not parent_item:
        raise HTTPException(status_code=400, detail="Item pai não encontrado")

    current_parent_id = parent_item.parent_item_id
    while current_parent_id is not None:
        if current_parent_id == item_id:
            raise HTTPException(status_code=400, detail="Hierarquia inválida: ciclo detectado")

        next_parent = db.query(models.Item).filter(models.Item.id == current_parent_id).first()
        current_parent_id = next_parent.parent_item_id if next_parent else None


def collect_descendant_ids(db: Session, root_id: int):
    collected = []
    stack = [root_id]

    while stack:
        current_id = stack.pop()
        collected.append(current_id)

        children = db.query(models.Item.id).filter(models.Item.parent_item_id == current_id).all()
        stack.extend(child_id for (child_id,) in children)

    return collected


def require_admin(credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme)):
    if (
        credentials is None
        or credentials.scheme.lower() != "bearer"
        or not secrets.compare_digest(credentials.credentials, ADMIN_TOKEN)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autorizado")

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite o acesso de qualquer dispositivo na rede local (celular, etc)
    allow_credentials=False, # Como usamos Bearer Token e não cookies, isso pode ser False
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/auth/login")
def login(payload: LoginRequest):
    valid_user = secrets.compare_digest(payload.username, ADMIN_USERNAME)
    valid_password = secrets.compare_digest(payload.password, ADMIN_PASSWORD)

    if not (valid_user and valid_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login inválido")

    return {
        "token": ADMIN_TOKEN,
        "user": {
            "username": ADMIN_USERNAME,
            "role": "admin",
        },
    }


@app.get("/items/status", response_model=None)
def get_items_status(db: Session = Depends(database.get_db)):
    items = db.query(models.Item).order_by(models.Item.name.asc()).all()
    open_transactions = db.query(models.Transaction).filter(models.Transaction.checkin_time.is_(None)).all()

    holder_by_item = {}
    for transaction in open_transactions:
        holder_by_item[transaction.item_id] = transaction.employee.name if transaction.employee else None

    parent_name_by_id, child_count_by_parent = build_item_relationship_maps(items)

    return [
        {
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "status": item.status.value,
            "holder": holder_by_item.get(item.id),
            "parent_item_id": item.parent_item_id,
            "parent_item_name": parent_name_by_id.get(item.parent_item_id),
            "has_sub_items": child_count_by_parent.get(item.id, 0) > 0,
        }
        for item in items
    ]


@app.get("/items", response_model=None, dependencies=[Depends(require_admin)])
def get_items(db: Session = Depends(database.get_db)):
    items = db.query(models.Item).order_by(models.Item.name.asc()).all()
    parent_name_by_id, child_count_by_parent = build_item_relationship_maps(items)

    return [serialize_item(item, parent_name_by_id, child_count_by_parent) for item in items]


@app.post("/items", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_item(payload: NewItemRequest, db: Session = Depends(database.get_db)):
    existing = db.query(models.Item).filter(models.Item.qr_code_hash == payload.qr_code_hash).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe item com este QR Code")

    if payload.parent_item_id is not None:
        parent_item = db.query(models.Item).filter(models.Item.id == payload.parent_item_id).first()
        if not parent_item:
            raise HTTPException(status_code=400, detail="Item pai não encontrado")

    item = models.Item(
        name=payload.name,
        category=payload.category,
        qr_code_hash=payload.qr_code_hash,
        status=payload.status,
        parent_item_id=payload.parent_item_id,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    all_items = db.query(models.Item).order_by(models.Item.name.asc()).all()
    parent_name_by_id, child_count_by_parent = build_item_relationship_maps(all_items)

    return serialize_item(item, parent_name_by_id, child_count_by_parent)


@app.put("/items/{item_id}", response_model=None, dependencies=[Depends(require_admin)])
def update_item(item_id: int, payload: UpdateItemRequest, db: Session = Depends(database.get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    existing = db.query(models.Item).filter(
        models.Item.qr_code_hash == payload.qr_code_hash,
        models.Item.id != item_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe item com este QR Code")

    validate_parent_assignment(db, item_id, payload.parent_item_id)

    item.name = payload.name
    item.category = payload.category
    item.qr_code_hash = payload.qr_code_hash
    item.status = payload.status
    item.parent_item_id = payload.parent_item_id

    db.commit()
    db.refresh(item)

    all_items = db.query(models.Item).order_by(models.Item.name.asc()).all()
    parent_name_by_id, child_count_by_parent = build_item_relationship_maps(all_items)
    return serialize_item(item, parent_name_by_id, child_count_by_parent)


@app.delete("/items/{item_id}", response_model=None, dependencies=[Depends(require_admin)])
def delete_item(item_id: int, delete_mode: str = "move_children", db: Session = Depends(database.get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    children = db.query(models.Item).filter(models.Item.parent_item_id == item.id).all()

    if children and delete_mode not in {"move_children", "delete_children"}:
        raise HTTPException(status_code=400, detail="Modo de exclusão inválido")

    if children and delete_mode == "move_children":
        for child in children:
            child.parent_item_id = item.parent_item_id

        db.query(models.Transaction).filter(models.Transaction.item_id == item.id).delete(synchronize_session=False)
        db.delete(item)
        db.commit()
        return {"message": "Item excluído e subitens movidos"}

    if children and delete_mode == "delete_children":
        ids_to_delete = collect_descendant_ids(db, item.id)
        db.query(models.Transaction).filter(models.Transaction.item_id.in_(ids_to_delete)).delete(synchronize_session=False)
        db.query(models.Item).filter(models.Item.id.in_(ids_to_delete)).delete(synchronize_session=False)
        db.commit()
        return {"message": "Item e subitens excluídos"}

    db.query(models.Transaction).filter(models.Transaction.item_id == item.id).delete(synchronize_session=False)
    db.delete(item)
    db.commit()
    return {"message": "Item excluído"}

# 1. Buscar Item por QR Hash
@app.get("/items/qr/{qr_hash}", response_model=None)
def get_item_by_qr(qr_hash: str, db: Session = Depends(database.get_db)):
    item = db.query(models.Item).filter(models.Item.qr_code_hash == qr_hash).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    
    # Se estiver emprestado, buscamos a última transação aberta
    last_transaction = None
    if item.status == models.ItemStatus.LENT:
        last_transaction = db.query(models.Transaction).filter(
            models.Transaction.item_id == item.id,
            models.Transaction.checkin_time.is_(None)
        ).first()
        
        if last_transaction:
            # Força o carregamento do employee para o JSON
            _ = last_transaction.employee 

    return {
        "item": item,
        "current_transaction": last_transaction
    }

# 2. Listar Funcionários Ativos (para o dropdown do 'Soft Login')
@app.get("/employees/active", response_model=None)
def get_active_employees(db: Session = Depends(database.get_db)):
    return db.query(models.Employee).filter(models.Employee.is_active.is_(True)).all()


@app.get("/employees", response_model=None, dependencies=[Depends(require_admin)])
def get_employees(db: Session = Depends(database.get_db)):
    return db.query(models.Employee).order_by(models.Employee.name.asc()).all()


@app.post("/employees", status_code=status.HTTP_201_CREATED, response_model=None, dependencies=[Depends(require_admin)])
def create_employee(payload: NewEmployeeRequest, db: Session = Depends(database.get_db)):
    name = payload.name.strip()
    department = payload.department.strip() if payload.department else None

    if not name:
        raise HTTPException(status_code=400, detail="Nome do funcionário é obrigatório")

    employee = models.Employee(
        name=name,
        department=department,
        is_active=payload.is_active,
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@app.put("/employees/{employee_id}", response_model=None, dependencies=[Depends(require_admin)])
def update_employee(employee_id: int, payload: UpdateEmployeeRequest, db: Session = Depends(database.get_db)):
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")

    name = payload.name.strip()
    department = payload.department.strip() if payload.department else None

    if not name:
        raise HTTPException(status_code=400, detail="Nome do funcionário é obrigatório")

    employee.name = name
    employee.department = department
    employee.is_active = payload.is_active

    db.commit()
    db.refresh(employee)
    return employee


@app.delete("/employees/{employee_id}", response_model=None, dependencies=[Depends(require_admin)])
def delete_employee(employee_id: int, db: Session = Depends(database.get_db)):
    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")

    has_transactions = (
        db.query(models.Transaction.id)
        .filter(models.Transaction.employee_id == employee_id)
        .first()
        is not None
    )
    if has_transactions:
        raise HTTPException(
            status_code=400,
            detail="Não é possível excluir funcionário com histórico de movimentações",
        )

    db.delete(employee)
    db.commit()
    return {"message": "Funcionário excluído"}

# 3. Registrar Empréstimo (Checkout)
@app.post("/transactions/checkout", status_code=status.HTTP_201_CREATED)
def checkout_item(
    item_id: int,
    employee_id: int,
    expected_return: datetime = None,
    observacao: Optional[str] = None,
    destino: Optional[str] = None,
    db: Session = Depends(database.get_db),
):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if item.status != models.ItemStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Item não está disponível")

    observacao = observacao.strip() if observacao else None
    destino = destino.strip() if destino else None

    # Cria transação
    new_trans = models.Transaction(
        item_id=item_id,
        employee_id=employee_id,
        expected_return=expected_return,
        observacao=observacao,
        destino=destino,
    )
    # Atualiza status do item
    item.status = models.ItemStatus.LENT
    
    db.add(new_trans)
    db.commit()
    return {"message": "Empréstimo realizado com sucesso"}

# 4. Registrar Devolução (Check-in)
@app.post("/transactions/checkin")
def checkin_item(
    item_id: int,
    observacao: Optional[str] = None,
    db: Session = Depends(database.get_db),
):
    # Busca a transação aberta para este item
    transaction = db.query(models.Transaction).filter(
        models.Transaction.item_id == item_id,
        models.Transaction.checkin_time.is_(None)
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Nenhuma transação ativa encontrada para este item")

    # Fecha transação e libera item
    transaction.checkin_time = datetime.utcnow()
    transaction.observacao_checkin = observacao.strip() if observacao else None
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    item.status = models.ItemStatus.AVAILABLE

    db.commit()
    return {"message": "Devolução confirmada"}


# 5. Histórico de Movimentações (público)
@app.get("/transactions/history", response_model=None)
def get_transaction_history(db: Session = Depends(database.get_db)):
    transactions = (
        db.query(models.Transaction)
        .order_by(models.Transaction.checkout_time.desc())
        .limit(200)
        .all()
    )

    result = []
    for t in transactions:
        item = t.item
        employee = t.employee
        result.append({
            "id": t.id,
            "item_name": item.name if item else "Item removido",
            "item_category": item.category if item else "",
            "employee_name": employee.name if employee else "Desconhecido",
            "destino": t.destino,
            "observacao": t.observacao,
            "observacao_checkin": t.observacao_checkin,
            "checkout_time": t.checkout_time.isoformat() if t.checkout_time else None,
            "checkin_time": t.checkin_time.isoformat() if t.checkin_time else None,
        })

    return result
