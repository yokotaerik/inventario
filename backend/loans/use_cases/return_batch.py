from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from ...inventory.domain.item import Item, ItemStatus
from ...inventory.repository.item_repository import ItemRepository
from ...shared.exceptions import ConflictError, NotFoundError, ValidationError
from ...workforce.repository.employee_repository import EmployeeRepository
from ..repository.loan_repository import LoanRepository

MODE_ALL_LENT = "all_lent"
MODE_SINGLE_LENT = "single_lent"
_VALID_MODES = {MODE_ALL_LENT, MODE_SINGLE_LENT}


class ReturnBatchUseCase:
    """Devolve todos os itens emprestados da família de uma maleta, ou apenas um específico."""

    def __init__(self, db: Session):
        self.db = db
        self.item_repo = ItemRepository(db)
        self.employee_repo = EmployeeRepository(db)
        self.loan_repo = LoanRepository(db)

    def execute(
        self,
        container_item_id: int,
        mode: str = MODE_ALL_LENT,
        target_item_id: Optional[int] = None,
        employee_id: Optional[int] = None,
        observacao: Optional[str] = None,
    ) -> dict:
        if mode not in _VALID_MODES:
            raise ValidationError("Modo de devolução inválido")

        container, children = self._get_container(container_item_id)
        family_items = [container] + children
        family_by_id = {fi.id: fi for fi in family_items}
        active_loan_map = self.loan_repo.active_map_by_item_ids(list(family_by_id.keys()))

        if employee_id is not None and not self.employee_repo.get_by_id(employee_id):
            raise NotFoundError("Funcionário não encontrado")

        if mode == MODE_SINGLE_LENT:
            process_items, skipped_items = self._resolve_single(
                family_by_id, active_loan_map, target_item_id
            )
        else:
            process_items, skipped_items = self._resolve_all_lent(
                family_items, active_loan_map, employee_id
            )
            if not process_items:
                raise ConflictError("Nenhum item emprestado encontrado para devolução")

        observacao_checkin = observacao.strip() if observacao else None
        now = datetime.utcnow()

        for item in process_items:
            loan = active_loan_map.get(item.id)
            if not loan:
                continue
            loan.checkin_time = now
            loan.observacao_checkin = observacao_checkin
            item.status = ItemStatus.AVAILABLE

        self.db.commit()

        processed = [{"id": item.id, "name": item.name} for item in process_items]
        return {
            "message": "Devolução processada com sucesso",
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

    def _resolve_single(
        self, family_by_id, active_loan_map, target_item_id: Optional[int]
    ) -> tuple[list[Item], list[dict]]:
        if target_item_id is None:
            raise ValidationError("Informe o item para devolução individual")

        target_item = family_by_id.get(target_item_id)
        if not target_item:
            raise ValidationError("Item inválido para esta maleta")

        if not active_loan_map.get(target_item_id):
            raise ConflictError("Item selecionado não possui empréstimo ativo")

        return [target_item], []

    def _resolve_all_lent(
        self,
        family_items: list[Item],
        active_loan_map: dict,
        employee_id: Optional[int],
    ) -> tuple[list[Item], list[dict]]:
        process_items: list[Item] = []
        skipped_items: list[dict] = []

        for fi in family_items:
            loan = active_loan_map.get(fi.id)
            if not loan:
                skipped_items.append(
                    {"id": fi.id, "name": fi.name, "reason": "sem_emprestimo_ativo"}
                )
                continue
            if employee_id is not None and loan.employee_id != employee_id:
                skipped_items.append(
                    {
                        "id": fi.id,
                        "name": fi.name,
                        "reason": "emprestado_por_outro_funcionario",
                    }
                )
                continue
            process_items.append(fi)

        return process_items, skipped_items
