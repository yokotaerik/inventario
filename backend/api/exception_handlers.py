from fastapi import FastAPI
from fastapi.requests import Request
from fastapi.responses import JSONResponse

from ..shared.exceptions import ConflictError, DomainError, NotFoundError, ValidationError


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def _not_found_handler(request: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content={"detail": exc.message})

    @app.exception_handler(ValidationError)
    async def _validation_handler(request: Request, exc: ValidationError):
        return JSONResponse(status_code=400, content={"detail": exc.message})

    @app.exception_handler(ConflictError)
    async def _conflict_handler(request: Request, exc: ConflictError):
        return JSONResponse(status_code=400, content={"detail": exc.message})

    @app.exception_handler(DomainError)
    async def _domain_handler(request: Request, exc: DomainError):
        return JSONResponse(status_code=500, content={"detail": exc.message})
