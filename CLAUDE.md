# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inventory management system with QR code scanning for item lending/borrowing. Items can form hierarchies (containers with sub-items), so batch operations can check out/in every item in a container at once. Items and employees are also grouped by **projects** and optional **project locations**.

## Tech Stack

- **Backend**: Python FastAPI + SQLAlchemy + SQLite (`./data/inventory.db`) + Uvicorn
- **Frontend**: React 19 + TypeScript + Vite + Zustand + Axios + Tailwind CSS 4
- **Deployment**: Docker Compose (backend on 8000, frontend Nginx on 8443 with HTTPS)

There are **no test suites or backend linters configured**. Frontend lint is ESLint only.

## Commands

### Development (Windows)

```bash
./run-dev.bat          # Start backend + frontend in separate windows
./run-dev.ps1 -Seed    # Same, but seed the database first (clears existing data)
```

### Backend

```bash
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
python -m backend.seed   # Clears entire DB and inserts fresh test data
```

**Database initialization:**
- On first startup, `ensure_schema()` creates the SQLite database at `./data/inventory.db` and all tables
- `bootstrap_admin_if_missing()` creates a default admin user (username: `admin`, password: `admin123`) if none exists
- Use `python -m backend.seed` to reset the database and load test fixtures (items, employees, projects, etc.)

### Frontend

```bash
cd frontend
npm install
npm run dev        # Vite dev server with proxy to backend
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Docker

```bash
docker-compose up --build
```

## Architecture

### Backend (`backend/`) — DDD bounded contexts

Each context owns its domain, repositories, schemas, and use cases. `main.py` imports every domain module so SQLAlchemy sees all ORM classes before `Base.metadata.create_all` runs — **do not remove those side-effect imports**. On startup, the app also runs schema migrations and bootstraps an admin user if one doesn't exist.

```
backend/
├── main.py                 # FastAPI app, CORS, routers, exception handlers
├── seed.py                 # Test data seeding (clears DB on run)
├── shared/
│   ├── database.py         # Base, engine, SessionLocal, get_db
│   ├── migrations.py       # Additive ALTER TABLE on startup (safe to re-run)
│   ├── product_code.py     # next_product_code() autogen helper
│   ├── security.py         # Password hashing utilities
│   ├── bootstrap.py        # bootstrap_admin_if_missing() initializes default admin
│   └── exceptions.py       # DomainError, NotFoundError, ValidationError, ConflictError
├── auth/                   # Session management (login/logout, separate from API auth)
│   ├── domain/session.py   # Session domain model
│   ├── use_cases/          # login.py, logout.py
│   └── repository/
├── inventory/              # Items + self-referential hierarchy (parent_item_id)
├── workforce/              # Employees
├── loans/                  # Loans (mapped to legacy `transactions` table)
│   └── specifications/specs.py   # *Spec classes with is_satisfied_by() for business rules
├── projects/               # Projects + ProjectLocations + AnyDeskEntry (remote access credentials)
├── stock/                  # Stock items (inventory of materials/supplies)
│   ├── domain/stock_item.py
│   ├── repository/
│   ├── schemas/
│   └── use_cases/
└── api/
    ├── auth.py             # Bearer token + require_admin dependency for route protection
    ├── exception_handlers.py  # DomainError → HTTPException
    └── routes/             # auth, items, employees, loans, projects, stock
```

**Key rules:**
- Use cases own transaction boundaries (`db.commit()` lives in use cases, not repositories). Repositories only manipulate the session.
- The `Loan` class maps to the **legacy `transactions` SQL table** (`__tablename__ = "transactions"`) to preserve existing data. The loans route prefix is also kept as **`/transactions`** for frontend compatibility — do not rename either.
- Business rules live as `*Spec` classes in `loans/specifications/specs.py`. Use cases compose specs and raise `DomainError` subclasses; the exception handler converts those to HTTP responses. Add new invariants as specs, not inline checks in routes.
- Loan invariants enforced by `CreateLoanUseCase` / `CreateBatchLoanUseCase`: destination required, employee required, item must be `AVAILABLE` with no active loan. Multiple concurrent loans per employee are allowed.
- **API Authentication**: Bearer token in `Authorization` header. Apply `Depends(require_admin)` to protected routes (defined in `api/auth.py`).
- **Session Authentication**: The `auth` context handles login/logout for UI sessions, separate from API token auth. Login creates a `Session` record.
- **Projects & AnyDesk**: `AnyDeskEntry` stores remote access credentials per project (for field technicians). Created/updated/deleted via `/projects/{project_id}/anydesk` endpoints.
- CORS is open to all origins so mobile devices on the local network can hit it.

### Frontend (`frontend/src/`) — mirrors backend bounded contexts

Each backend bounded context has a corresponding Zustand store for state management and API calls:

```
src/
├── App.tsx                 # Tab routing + top-level layout
├── pages/                  # Page components (LoansPage, InventoryPage)
├── components/             # Cross-cutting: BottomNav, QRScanner, Drawer
├── shared/                 # api client, formatters, qr util, hooks
├── inventory/              # components + useItemStore (items, hierarchies, status)
├── workforce/              # components + useEmployeeStore (employees)
├── loans/                  # components (ScannerView, History, Checkout/Checkin) + useLoanStore
├── projects/               # components + useProjectStore (projects, locations, AnyDesk entries)
├── stock/                  # components + useStockStore (supply items)
└── store/useInventoryStore.ts  # Compatibility facade — re-exports per-context stores (legacy)
```

- **Zustand stores** (`useItemStore`, `useLoanStore`, etc.) handle all API calls and cache state. Each store mirrors a backend context.
- Prefer importing context-specific stores directly (e.g., `import { useLoanStore } from '@/loans/store/useLoanStore'`). The facade `useInventoryStore` exists for backwards compatibility only.
- Bearer token is stored in `localStorage` under `inventory_admin_token` (see `shared/api/client.ts`).
- **Proxy configuration**: In dev, Vite proxies API routes (`/auth`, `/items`, `/employees`, `/transactions`, `/projects`, `/stock`) to `http://127.0.0.1:8000`. In production, `VITE_API_URL` is empty so axios uses relative paths, which Nginx proxies to the backend. Override dev target with `VITE_API_PROXY_TARGET` env var.

### Database schema — non-obvious points

**Items & Hierarchy:**
- `items.parent_item_id` — self-FK enabling container/kit hierarchies. When checking out a container, all sub-items are checked out in a single batch operation.
- `items.qr_code_hash` — unique identifier scanned by the QR reader (URL-safe hash, not human-readable).
- `items.product_code` — autogenerated as `{project.code}-{NNNN}` when item is created with a project and no explicit code.
- `items.status` — `AVAILABLE` | `LENT` | `MAINTENANCE`.

**Stock Items vs. Items:**
- `items` = tracked equipment/hardware with individual QR codes (laptops, tools, etc.). Can be checked out/returned.
- `stock_items` = bulk inventory/supplies (cables, screws, batteries, etc.). Linked to projects. No checkout/return tracking.
- Both auto-generate `product_code` per project using `next_product_code()`.

**Projects & Locations:**
- `items.project_id` — optional FK to `projects`; `items.location_id` may point to `project_locations`.
- `projects.code` — unique, auto-generated as `70{4-alphanumeric}` with collision retry (5 max).
- `ProjectLocation` belongs to exactly one project (cascade delete).

**Loans (Transactions):**
- `transactions` table stores loan records via the `Loan` domain model.
- `transactions.batch_code` + `transactions.batch_root_item_id` link batch checkout/return operations. Checking out a container creates one batch record covering all sub-items.

**Schema Evolution:**
- `shared/migrations.py::ensure_schema()` runs on startup and adds missing columns via additive `ALTER TABLE` (safe to re-run).
- Add new columns here rather than wiping the database; avoid breaking existing deployments.

### Proxy configuration

- **Dev**: `vite.config.ts` proxies the API route prefixes listed above. Target overridable via `VITE_API_PROXY_TARGET`.
- **Production**: `nginx.conf` proxies the same routes to `http://backend:8000`, terminates HTTPS (certs at `/etc/nginx/ssl/`), and serves SPA routing via `try_files`.

## Common Workflows

### Adding a new API endpoint

1. Create domain logic in `backend/{context}/domain/` (if needed)
2. Create use case in `backend/{context}/use_cases/` — this owns the transaction boundary
3. Create Pydantic schema in `backend/{context}/schemas/`
4. Add route in `backend/api/routes/{context}.py` and `include_router` in `main.py`
5. Create Zustand store method in `frontend/src/{context}/store/use{Context}Store.ts`
6. Create frontend component/page that calls the store

### Adding a new database column

1. Add to the domain model class in `backend/{context}/domain/{model}.py`
2. Add to the `ensure_schema()` function in `shared/migrations.py` using additive `ALTER TABLE`
3. **Do not** run `Base.metadata.create_all()` again — migrations handle schema evolution
4. Update the Pydantic schema in `backend/{context}/schemas/` if the column is API-exposed

### Modifying loan rules

- Edit `backend/loans/specifications/specs.py` to add/modify `*Spec` classes
- Use cases (`CreateLoanUseCase`, `CreateBatchLoanUseCase`, etc.) compose these specs
- Raise `DomainError` subclasses on violation; the exception handler converts to HTTP 400/409
- Tests: create fixtures in `backend/seed.py` that exercise the new invariants

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `INVENTORY_ADMIN_USER` | `admin` | Login username (checked on startup) |
| `INVENTORY_ADMIN_PASSWORD` | `admin123` | Login password (hashed with bcrypt) |
| `INVENTORY_ADMIN_TOKEN` | `inventory-admin-token` | Bearer token for API (no hashing; stored as-is) |
| `VITE_API_URL` | `""` | Frontend API base URL (empty = relative proxying via Nginx) |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:8000` | Dev Vite proxy target (override for non-localhost backends) |
