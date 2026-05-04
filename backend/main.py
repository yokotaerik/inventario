from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Os imports abaixo registram os modelos ORM no metadata do SQLAlchemy
# antes de `create_all` rodar. Não remover.
from .inventory.domain.item import Item  # noqa: F401
from .workforce.domain.employee import Employee  # noqa: F401
from .loans.domain.loan import Loan  # noqa: F401
from .projects.domain.project import Project, ProjectLocation, AnyDeskEntry  # noqa: F401
from .stock.domain.stock_item import StockItem  # noqa: F401
from .auth.domain.session import Session  # noqa: F401

from .api.exception_handlers import register_exception_handlers
from .api.routes import auth as auth_routes
from .api.routes import employees as employee_routes
from .api.routes import items as item_routes
from .api.routes import loans as loan_routes
from .api.routes import projects as project_routes
from .api.routes import stock as stock_routes
from .shared.database import Base, engine
from .shared.migrations import ensure_schema, backfill_location_codes
from .shared.bootstrap import bootstrap_admin_if_missing

Base.metadata.create_all(bind=engine)
ensure_schema()
backfill_location_codes()
bootstrap_admin_if_missing()

app = FastAPI(title="Inventory QR Control API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(auth_routes.router)
app.include_router(item_routes.router)
app.include_router(employee_routes.router)
app.include_router(loan_routes.router)
app.include_router(project_routes.router)
app.include_router(stock_routes.router)

