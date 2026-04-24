# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inventory management system with QR code scanning for item lending/borrowing. Items can form hierarchies (containers with sub-items), and batch operations allow checking out/in all items in a container at once.

## Tech Stack

- **Backend**: Python FastAPI + SQLAlchemy + SQLite (`./data/inventory.db`) + Uvicorn
- **Frontend**: React 19 + TypeScript + Vite + Zustand + Axios + Tailwind CSS 4
- **Deployment**: Docker Compose (two containers: backend on 8000, frontend Nginx on 8443 with HTTPS)

## Commands

### Development (Windows)

```bash
./run-dev.bat          # Start both backend and frontend
./run-dev.ps1 -Seed    # Start with database seeding
```

### Backend

```bash
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
python -m backend.seed   # Seed test data (clears existing data first)
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # Dev server with proxy to backend
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

### Docker

```bash
docker-compose up --build
```

## Architecture

### Backend (`backend/`)

DDD with bounded contexts. Each context owns its domain, repositories, schemas, and use cases.

```
backend/
├── main.py                 # Mounts FastAPI, CORS, routes, exception handlers
├── seed.py                 # Test data seeder
├── shared/
│   ├── database.py         # SQLAlchemy Base, engine, SessionLocal, get_db
│   ├── migrations.py       # Lightweight schema additive migrations (adds missing columns)
│   └── exceptions.py       # DomainError, NotFoundError, ValidationError, ConflictError
├── inventory/              # Items + hierarchy (parent_item_id)
│   ├── domain/item.py
│   ├── repository/item_repository.py
│   ├── schemas/item_schemas.py       # Pydantic I/O + serializers
│   └── use_cases/                    # CreateItem, UpdateItem, DeleteItem, GetItemByQR, ...
├── workforce/              # Employees
│   ├── domain/employee.py
│   ├── repository/employee_repository.py
│   ├── schemas/employee_schemas.py
│   └── use_cases/
├── loans/                  # Loans (maps to legacy `transactions` table)
│   ├── domain/loan.py
│   ├── repository/loan_repository.py
│   ├── specifications/specs.py       # Business rules (ItemIsAvailable, LoanRequiresDestination, ...)
│   ├── schemas/loan_schemas.py
│   └── use_cases/                    # CreateLoan, CreateBatchLoan, ReturnLoan, ReturnBatch, ListHistory
└── api/
    ├── auth.py             # Bearer token + require_admin dependency
    ├── exception_handlers.py  # Maps DomainError → HTTPException
    └── routes/             # auth.py, items.py, employees.py, loans.py
```

**Key rules:**
- Use cases own transaction boundaries (`db.commit()` lives in use cases, not repositories). Repositories only manipulate the session.
- The `Loan` class is mapped to the legacy `transactions` SQL table (`__tablename__ = "transactions"`) to preserve existing data. The loans route prefix is also kept as `/transactions` for frontend compatibility.
- Business rules live in `loans/specifications/specs.py` as `*Spec` classes with `is_satisfied_by()`. Use cases combine specs and raise `DomainError` subclasses; the exception handler maps these to HTTP responses.
- Loan invariants (enforced in `CreateLoanUseCase` / `CreateBatchLoanUseCase`): destination is required, employee is required, item must be `AVAILABLE` and have no active loan. Multiple concurrent loans per employee are allowed.
- Auth uses Bearer tokens. `require_admin()` is the FastAPI dependency for protected routes.
- CORS is open to all origins (local network access from mobile).

### Frontend (`frontend/src/`)

- `App.tsx` — Monolithic main component handling all pages and navigation logic (~78KB). Most feature code lives here.
- `store/useInventoryStore.ts` — Zustand store; all API calls go through here. Token stored in `localStorage` under key `inventory_admin_token`.
- `components/` — Only `QRScanner` and `BottomNav` components extracted so far.
- API base URL is empty in production (relative paths via Nginx proxy). Dev server proxies `/auth`, `/items`, `/employees`, `/transactions` to `http://127.0.0.1:8000`.

### Database Schema Key Points

- `items.parent_item_id` — self-referential FK enabling container/kit hierarchies.
- `items.qr_code_hash` — unique identifier scanned by the QR reader.
- `transactions.batch_code` + `transactions.batch_root_item_id` — link batch operations (checking out a container checks out all sub-items under one batch). The `transactions` table is the persistence for the `Loan` domain model.
- `items.status` — `available` | `lent` | `maintenance`.
- Schema evolution: `shared/migrations.py::ensure_schema()` runs on startup and adds any missing columns via additive `ALTER TABLE` — safe to re-run.

### Proxy Configuration

- **Dev**: `vite.config.ts` proxies API routes to backend. Target overridable via `VITE_API_PROXY_TARGET`.
- **Production**: `nginx.conf` proxies the same routes to `http://backend:8000`. Nginx also handles HTTPS (certs at `/etc/nginx/ssl/`) and SPA routing (`try_files` fallback).

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `INVENTORY_ADMIN_USER` | `admin` | Login username |
| `INVENTORY_ADMIN_PASSWORD` | `admin123` | Login password |
| `INVENTORY_ADMIN_TOKEN` | `inventory-admin-token` | Bearer token for API |
| `VITE_API_URL` | `""` | Frontend API base URL (empty = relative) |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:8000` | Dev proxy target |
