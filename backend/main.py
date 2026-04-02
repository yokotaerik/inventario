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
        if "batch_code" not in existing_columns:
            connection.execute(text("ALTER TABLE transactions ADD COLUMN batch_code VARCHAR"))
        if "batch_root_item_id" not in existing_columns:
            connection.execute(text("ALTER TABLE transactions ADD COLUMN batch_root_item_id INTEGER"))


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


def get_container_with_children(db: Session, container_item_id: int):
    container = db.query(models.Item).filter(models.Item.id == container_item_id).first()
    if not container:
        raise HTTPException(status_code=404, detail="Maleta não encontrada")

    if container.parent_item_id is not None:
        raise HTTPException(status_code=400, detail="O item informado não é uma maleta principal")

    children = (
        db.query(models.Item)
        .filter(models.Item.parent_item_id == container.id)
        .order_by(models.Item.name.asc())
        .all()
    )
    return container, children


def serialize_transaction(transaction: Optional[models.Transaction]):
    if not transaction:
        return None

    employee = transaction.employee
    employee_payload = None
    if employee:
        employee_payload = {
            "id": employee.id,
            "name": employee.name,
        }

    return {
        "id": transaction.id,
        "employee": employee_payload,
    }


def serialize_family_member(
    item: models.Item,
    parent_name_by_id: dict[int, str],
    child_count_by_parent: dict[int, int],
    open_transaction: Optional[models.Transaction],
):
    payload = serialize_item(item, parent_name_by_id, child_count_by_parent)
    payload["current_transaction"] = serialize_transaction(open_transaction)
    return payload


def get_open_transaction_map(db: Session, item_ids: list[int]):
    if not item_ids:
        return {}

    open_transactions = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.item_id.in_(item_ids),
            models.Transaction.checkin_time.is_(None),
        )
        .all()
    )

    transaction_by_item_id = {}
    for transaction in open_transactions:
        _ = transaction.employee
        transaction_by_item_id[transaction.item_id] = transaction

    return transaction_by_item_id


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

    all_items = db.query(models.Item).all()
    parent_name_by_id, child_count_by_parent = build_item_relationship_maps(all_items)

    container_item = item
    if item.parent_item_id is not None:
        container_item = db.query(models.Item).filter(models.Item.id == item.parent_item_id).first() or item

    children = (
        db.query(models.Item)
        .filter(models.Item.parent_item_id == container_item.id)
        .order_by(models.Item.name.asc())
        .all()
    )

    family_items = [container_item] + children
    family_item_ids = [family_item.id for family_item in family_items]
    open_transaction_map = get_open_transaction_map(db, family_item_ids)

    current_transaction = open_transaction_map.get(item.id)
    family_children = [
        serialize_family_member(
            child,
            parent_name_by_id,
            child_count_by_parent,
            open_transaction_map.get(child.id),
        )
        for child in children
    ]

    family_lent_items = [
        serialize_family_member(
            family_item,
            parent_name_by_id,
            child_count_by_parent,
            open_transaction_map.get(family_item.id),
        )
        for family_item in family_items
        if open_transaction_map.get(family_item.id)
    ]

    return {
        "item": serialize_item(item, parent_name_by_id, child_count_by_parent),
        "current_transaction": serialize_transaction(current_transaction),
        "family_container_id": container_item.id,
        "family_children": family_children,
        "family_lent_items": family_lent_items,
        "is_container_scan": item.id == container_item.id and len(children) > 0,
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
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")

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


@app.post("/transactions/checkout/container", status_code=status.HTTP_201_CREATED)
def checkout_container_items(
    container_item_id: int,
    employee_id: int,
    mode: str = "full_available",
    target_child_id: Optional[int] = None,
    expected_return: datetime = None,
    observacao: Optional[str] = None,
    destino: Optional[str] = None,
    db: Session = Depends(database.get_db),
):
    if mode not in {"full_available", "single_child"}:
        raise HTTPException(status_code=400, detail="Modo de retirada inválido")

    employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")

    container, children = get_container_with_children(db, container_item_id)

    observacao = observacao.strip() if observacao else None
    destino = destino.strip() if destino else None
    batch_code = secrets.token_urlsafe(8) if mode == "full_available" else None

    process_items = []
    skipped_items = []

    if mode == "single_child":
        if target_child_id is None:
            raise HTTPException(status_code=400, detail="Informe o subitem para retirada individual")

        target_child = next((child for child in children if child.id == target_child_id), None)
        if not target_child:
            raise HTTPException(status_code=400, detail="Subitem inválido para esta maleta")

        has_open_transaction = (
            db.query(models.Transaction.id)
            .filter(
                models.Transaction.item_id == target_child.id,
                models.Transaction.checkin_time.is_(None),
            )
            .first()
            is not None
        )

        if target_child.status != models.ItemStatus.AVAILABLE or has_open_transaction:
            raise HTTPException(status_code=400, detail="Subitem não está disponível")

        process_items = [target_child]
    else:
        candidates = [container] + children
        for candidate in candidates:
            has_open_transaction = (
                db.query(models.Transaction.id)
                .filter(
                    models.Transaction.item_id == candidate.id,
                    models.Transaction.checkin_time.is_(None),
                )
                .first()
                is not None
            )

            if candidate.status != models.ItemStatus.AVAILABLE:
                skipped_items.append(
                    {
                        "id": candidate.id,
                        "name": candidate.name,
                        "reason": "item_indisponivel",
                    }
                )
                continue

            if has_open_transaction:
                skipped_items.append(
                    {
                        "id": candidate.id,
                        "name": candidate.name,
                        "reason": "transacao_ativa",
                    }
                )
                continue

            process_items.append(candidate)

        if not process_items:
            raise HTTPException(status_code=400, detail="Nenhum item disponível para retirada nesta maleta")

    for process_item in process_items:
        process_item.status = models.ItemStatus.LENT
        db.add(
            models.Transaction(
                item_id=process_item.id,
                employee_id=employee_id,
                expected_return=expected_return,
                observacao=observacao,
                destino=destino,
                batch_code=batch_code,
                batch_root_item_id=container.id if mode == "full_available" else None,
            )
        )

    db.commit()

    processed_items = [{"id": process_item.id, "name": process_item.name} for process_item in process_items]
    return {
        "message": "Retirada processada com sucesso",
        "mode": mode,
        "container_item_id": container.id,
        "processed_items": processed_items,
        "processed_count": len(processed_items),
        "skipped_items": skipped_items,
        "skipped_count": len(skipped_items),
    }

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


@app.post("/transactions/checkin/container")
def checkin_container_items(
    container_item_id: int,
    mode: str = "all_lent",
    target_item_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    observacao: Optional[str] = None,
    db: Session = Depends(database.get_db),
):
    if mode not in {"all_lent", "single_lent"}:
        raise HTTPException(status_code=400, detail="Modo de devolução inválido")

    container, children = get_container_with_children(db, container_item_id)
    family_items = [container] + children
    family_item_by_id = {family_item.id: family_item for family_item in family_items}
    open_transaction_map = get_open_transaction_map(db, list(family_item_by_id.keys()))

    process_items = []
    skipped_items = []

    if employee_id is not None:
        employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Funcionário não encontrado")

    if mode == "single_lent":
        if target_item_id is None:
            raise HTTPException(status_code=400, detail="Informe o item para devolução individual")

        target_item = family_item_by_id.get(target_item_id)
        if not target_item:
            raise HTTPException(status_code=400, detail="Item inválido para esta maleta")

        if not open_transaction_map.get(target_item_id):
            raise HTTPException(status_code=400, detail="Item selecionado não possui empréstimo ativo")

        process_items = [target_item]
    else:
        for family_item in family_items:
            open_transaction = open_transaction_map.get(family_item.id)
            if not open_transaction:
                skipped_items.append(
                    {
                        "id": family_item.id,
                        "name": family_item.name,
                        "reason": "sem_emprestimo_ativo",
                    }
                )
                continue

            if employee_id is not None and open_transaction.employee_id != employee_id:
                skipped_items.append(
                    {
                        "id": family_item.id,
                        "name": family_item.name,
                        "reason": "emprestado_por_outro_funcionario",
                    }
                )
                continue

            process_items.append(family_item)

        if not process_items:
            raise HTTPException(status_code=400, detail="Nenhum item emprestado encontrado para devolução")

    observacao_checkin = observacao.strip() if observacao else None
    for process_item in process_items:
        transaction = open_transaction_map.get(process_item.id)
        if not transaction:
            continue
        transaction.checkin_time = datetime.utcnow()
        transaction.observacao_checkin = observacao_checkin
        process_item.status = models.ItemStatus.AVAILABLE

    db.commit()

    processed_items = [{"id": process_item.id, "name": process_item.name} for process_item in process_items]
    return {
        "message": "Devolução processada com sucesso",
        "mode": mode,
        "container_item_id": container.id,
        "processed_items": processed_items,
        "processed_count": len(processed_items),
        "skipped_items": skipped_items,
        "skipped_count": len(skipped_items),
    }


# 5. Histórico de Movimentações (público)
@app.get("/transactions/history", response_model=None)
def get_transaction_history(db: Session = Depends(database.get_db)):
    transactions = (
        db.query(models.Transaction)
        .order_by(models.Transaction.checkout_time.desc())
        .limit(200)
        .all()
    )

    batch_root_ids = {t.batch_root_item_id for t in transactions if t.batch_root_item_id is not None}
    batch_root_name_by_id = {}
    if batch_root_ids:
        batch_root_items = db.query(models.Item).filter(models.Item.id.in_(batch_root_ids)).all()
        batch_root_name_by_id = {item.id: item.name for item in batch_root_items}

    result = []
    for t in transactions:
        item = t.item
        employee = t.employee
        batch_root_item_name = batch_root_name_by_id.get(t.batch_root_item_id)

        result.append({
            "id": t.id,
            "item_id": item.id if item else None,
            "parent_item_id": item.parent_item_id if item else None,
            "item_name": item.name if item else "Item removido",
            "item_category": item.category if item else "",
            "employee_name": employee.name if employee else "Desconhecido",
            "destino": t.destino,
            "observacao": t.observacao,
            "observacao_checkin": t.observacao_checkin,
            "batch_code": t.batch_code,
            "batch_root_item_id": t.batch_root_item_id,
            "batch_root_item_name": batch_root_item_name,
            "checkout_time": t.checkout_time.isoformat() if t.checkout_time else None,
            "checkin_time": t.checkin_time.isoformat() if t.checkin_time else None,
        })

    return result
