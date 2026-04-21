from fastapi import Request
from fastapi.responses import JSONResponse
from .logging import log


class ApiError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: dict | None = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


def install(app):
    @app.exception_handler(ApiError)
    async def _api(request: Request, exc: ApiError):  # type: ignore[unused-ignore]
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                    "requestId": getattr(request.state, "request_id", None),
                }
            },
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):  # type: ignore[unused-ignore]
        log.exception("unhandled_error", path=request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "An unexpected error occurred",
                    "requestId": getattr(request.state, "request_id", None),
                }
            },
        )
