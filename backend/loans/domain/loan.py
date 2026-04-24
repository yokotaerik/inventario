from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from ...shared.database import Base


class Loan(Base):
    """
    Empréstimo de um item físico a um funcionário.
    Mapeado na tabela legada `transactions` para preservar dados existentes.
    """

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))

    checkout_time = Column(DateTime, default=datetime.utcnow)
    expected_return = Column(DateTime)
    observacao = Column(String, nullable=True)
    destino = Column(String, nullable=True)
    batch_code = Column(String, nullable=True, index=True)
    batch_root_item_id = Column(Integer, ForeignKey("items.id"), nullable=True, index=True)
    checkin_time = Column(DateTime, nullable=True)
    observacao_checkin = Column(String, nullable=True)

    item = relationship("Item", foreign_keys=[item_id])
    batch_root_item = relationship("Item", foreign_keys=[batch_root_item_id])
    employee = relationship("Employee")

    @property
    def is_active(self) -> bool:
        return self.checkin_time is None
