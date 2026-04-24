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
./run-dev.ps1 -Seed    # Same, but seed the database first
```

### Backend

```bash
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
python -m backend.seed   # Clears DB then inserts test data
```

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

Each context owns its domain, repositories, schemas, and use cases. `main.py` imports every domain module so SQLAlchemy sees all ORM classes before `Base.metadata.create_all` runs — **do not remove those side-effect imports**.

```
backend/
├── main.py                 # FastAPI app, CORS, routers, exception handlers
├── seed.py
├── shared/
│   ├── database.py         # Base, engine, SessionLocal, get_db
│   ├── migrations.py       # Additive ALTER TABLE on startup (safe to re-run)
│   ├── product_code.py     # next_product_code() autogen helper
│   └── exceptions.py       # DomainError, NotFoundError, ValidationError, ConflictError
├── inventory/              # Items + self-referential hierarchy (parent_item_id)
├── workforce/              # Employees
├── loans/                  # Loans (mapped to legacy `transactions` table)
│   └── specifications/specs.py   # *Spec classes with is_satisfied_by() for business rules
├── projects/               # Projects + ProjectLocations (items FK → project)
├── stock/                  # Stock items (inventory of materials/supplies)
│   ├── domain/stock_item.py
│   ├── repository/
│   ├── schemas/
│   └── use_cases/
└── api/
    ├── auth.py             # Bearer token + require_admin dependency
    ├── exception_handlers.py  # DomainError → HTTPException
    └── routes/             # auth, items, employees, loans, projects, stock
```

**Key rules:**
- Use cases own transaction boundaries (`db.commit()` lives in use cases, not repositories). Repositories only manipulate the session.
- The `Loan` class maps to the **legacy `transactions` SQL table** (`__tablename__ = "transactions"`) to preserve existing data. The loans route prefix is also kept as **`/transactions`** for frontend compatibility — do not rename either.
- Business rules live as `*Spec` classes in `loans/specifications/specs.py`. Use cases compose specs and raise `DomainError` subclasses; the exception handler converts those to HTTP responses. Add new invariants as specs, not inline checks in routes.
- Loan invariants enforced by `CreateLoanUseCase` / `CreateBatchLoanUseCase`: destination required, employee required, item must be `AVAILABLE` with no active loan. Multiple concurrent loans per employee are allowed.
- Auth is Bearer tokens; apply `Depends(require_admin)` to protected routes.
- CORS is open to all origins so mobile devices on the local network can hit it.

### Frontend (`frontend/src/`) — mirrors backend bounded contexts

```
src/
├── App.tsx                 # Auth store + tab routing + top-level layout
├── pages/AdminPage.tsx
├── components/             # Cross-cutting: BottomNav, QRScanner
├── shared/                 # api client, formatters, qr util, hooks, Drawer
├── inventory/              # components, store (useItemStore), hooks
├── workforce/              # components, store (useEmployeeStore)
├── loans/                  # components (ScannerView, History, Check-in/out), store (useLoanStore)
├── projects/               # components, store (useProjectStore)
└── store/useInventoryStore.ts  # Compatibility facade — re-exports the per-context stores
```

- All API calls go through the per-context Zustand stores. `store/useInventoryStore.ts` is a facade for legacy imports; prefer importing the specific context store directly.
- Bearer token is stored in `localStorage` under `inventory_admin_token` (see `shared/api/client.ts`).
- In production `VITE_API_URL` is empty so axios uses relative paths proxied by Nginx. In dev, Vite proxies `/auth`, `/items`, `/employees`, `/transactions`, `/projects`, and `/api` (the last rewrites `/api` → `/`) to `http://127.0.0.1:8000` (override with `VITE_API_PROXY_TARGET`).

### Database schema — non-obvious points

- `items.parent_item_id` — self-FK enabling container/kit hierarchies.
- `items.qr_code_hash` — unique identifier scanned by the QR reader.
- `items.product_code` — autogenerated as `{project.code}-{NNNN}` when item is created with a project and no explicit code. Sequence shared with `stock_items.product_code` per project via `next_product_code()`.
- `items.project_id` — optional FK to `projects`; `items.location_id` may point to `project_locations`.
- `items.status` — `available` | `lent` | `maintenance`.
- `stock_items` — inventory/supply items linked to projects. Auto-generates `product_code` like items.
- `transactions.batch_code` + `transactions.batch_root_item_id` — link batch checkout/return operations (checking out a container creates one batch covering all its sub-items). This table is the persistence for the `Loan` domain model.
- `projects.code` is unique and auto-generated as `70{4-alphanumeric}` with collision retry (5 attempts max); a `ProjectLocation` belongs to exactly one project (cascade delete).
- `shared/migrations.py::ensure_schema()` runs on startup and adds missing columns via additive `ALTER TABLE`. Add new columns here rather than wiping the DB.

### Proxy configuration

- **Dev**: `vite.config.ts` proxies the API route prefixes listed above. Target overridable via `VITE_API_PROXY_TARGET`.
- **Production**: `nginx.conf` proxies the same routes to `http://backend:8000`, terminates HTTPS (certs at `/etc/nginx/ssl/`), and serves SPA routing via `try_files`.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `INVENTORY_ADMIN_USER` | `admin` | Login username |
| `INVENTORY_ADMIN_PASSWORD` | `admin123` | Login password |
| `INVENTORY_ADMIN_TOKEN` | `inventory-admin-token` | Bearer token for API |
| `VITE_API_URL` | `""` | Frontend API base URL (empty = relative) |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:8000` | Dev proxy target |
