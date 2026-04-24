import secrets
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from ...inventory.domain.item import Item, ItemStatus
from ...inventory.repository.item_repository import ItemRepository
from ...shared.exceptions import ConflictError, NotFoundError, ValidationError
from ...workforce.repository.employee_repository import EmployeeRepository
from ..domain.loan import Loan
from ..repository.loan_repository import LoanRepository
from ..specifications.specs import (
    LoanRequiresDestinationSpec,
    LoanRequiresEmployeeSpec,
)

MODE_FULL_AVAILABLE = "full_available"
MODE_SINGLE_CHILD = "single_child"
_VALID_MODES = {MODE_FULL_AVAILABLE, MODE_SINGLE_CHILD}


class CreateBatchLoanUseCase:
    """
    Empréstimo em lote a partir de uma maleta (container).

    - `full_available`: empresta container + todos os filhos disponíveis com batch_code comum.
    - `single_child`: empresta apenas um filho específico (sem batch).
    """

    def __init__(self, db: Session):
        self.db = db
        self.item_repo = ItemRepository(db)
        self.employee_repo = EmployeeRepository(db)
        self.loan_repo = LoanRepository(db)

    def execute(
        self,
        container_item_id: int,
        employee_id: int,
        destino: Optional[str],
        mode: str = MODE_FULL_AVAILABLE,
        target_child_id: Optional[int] = None,
        expected_return: Optional[datetime] = None,
        observacao: Optional[str] = None,
    ) -> dict:
        if mode not in _VALID_MODES:
            raise ValidationError("Modo de retirada inválido")

        destino_normalized = destino.strip() if destino else None
        observacao_normalized = observacao.strip() if observacao else None

        if not LoanRequiresDestinationSpec().is_satisfied_by(destino_normalized):
            raise ValidationError("Destino é obrigatório")

        employee = self.employee_repo.get_by_id(employee_id)
        if not LoanRequiresEmployeeSpec().is_satisfied_by(employee):
            raise NotFoundError("Funcionário não encontrado")

        container, children = self._get_container(container_item_id)

        batch_code = secrets.token_urlsafe(8) if mode == MODE_FULL_AVAILABLE else None

        if mode == MODE_SINGLE_CHILD:
            process_items, skipped_items = self._resolve_single_child(children, target_child_id)
        else:
            process_items, skipped_items = self._resolve_full_available(container, children)
            if not process_items:
                raise ConflictError("Nenhum item disponível para retirada nesta maleta")

        for item in process_items:
            item.status = ItemStatus.LENT
            loan = Loan(
                item_id=item.id,
                employee_id=employee_id,
                expected_return=expected_return,
                observacao=observacao_normalized,
                destino=destino_normalized,
                batch_code=batch_code,
                batch_root_item_id=container.id if mode == MODE_FULL_AVAILABLE else None,
            )
            self.loan_repo.add(loan)

        self.db.commit()

        processed = [{"id": item.id, "name": item.name} for item in process_items]
        return {
            "message": "Retirada processada com sucesso",
            "mode": mode,
            "container_item_id": container.id,
            "processed_items": processed,
            "processed_count": len(processed),
            "skipped_items": skipped_items,
            "skipped_count": len(skipped_items),
        }

    def _get_container(self, container_item_id: int) -> tuple[Item, list[Item]]:
        container = self.item_repo.get_by_id(container_item_id)
        if not container:
            raise NotFoundError("Maleta não encontrada")
        if container.parent_item_id is not None:
            raise ValidationError("O item informado não é uma maleta principal")
        children = self.item_repo.list_children(container.id)
        return container, children

    def _resolve_single_child(
        self, children: list[Item], target_child_id: Optional[int]
    ) -> tuple[list[Item], list[dict]]:
        if target_child_id is None:
            raise ValidationError("Informe o subitem para retirada individual")

        target_child = next((c for c in children if c.id == target_child_id), None)
        if not target_child:
            raise ValidationError("Subitem inválido para esta maleta")

        has_active_loan = self.loan_repo.get_active_by_item_id(target_child.id) is not None
        if target_child.status != ItemStatus.AVAILABLE or has_active_loan:
            raise ConflictError("Subitem não está disponível")

        return [target_child], []

    def _resolve_full_available(
        self, container: Item, children: list[Item]
    ) -> tuple[list[Item], list[dict]]:
        candidates = [container] + children
        candidate_ids = [c.id for c in candidates]
        active_loan_map = self.loan_repo.active_map_by_item_ids(candidate_ids)

        process_items: list[Item] = []
        skipped_items: list[dict] = []

        for candidate in candidates:
            if candidate.status != ItemStatus.AVAILABLE:
                skipped_items.append(
                    {"id": candidate.id, "name": candidate.name, "reason": "item_indisponivel"}
                )
                continue
            if active_loan_map.get(candidate.id) is not None:
                skipped_items.append(
                    {"id": candidate.id, "name": candidate.name, "reason": "transacao_ativa"}
                )
                continue
            process_items.append(candidate)

        return process_items, skipped_items
