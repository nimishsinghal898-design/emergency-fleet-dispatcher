import logging
import os
from fastapi import FastAPI, Request, HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from app.api.router import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Emergency Fleet Command API",
    description="Simulation backend API for evaluating emergency dispatch policies.",
    version="1.0.0"
)

# Secure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ], 
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Security Headers and Body Size Limiting Middleware
@app.middleware("http")
async def security_and_limit_middleware(request: Request, call_next):
    # Enforce request payload size limit (1 MB max)
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > 1_048_576:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "Payload too large. Maximum allowed size is 1MB."}
                )
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header."})

    response = await call_next(request)
    
    # Inject security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Standard HTTP Exception Handler (preserves status code and detail)
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

# Global safe error handler (prevents stack trace leaks for unhandled exceptions)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error. Please check backend logs."}
    )

app.include_router(router)

# Serve Frontend Static Files with Path Traversal Protection
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.isdir(frontend_path):
    assets_path = os.path.join(frontend_path, "assets")
    if os.path.isdir(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
    
    @app.get("/{catchall:path}")
    def serve_frontend(request: Request, catchall: str = ""):
        # Prevent Path Traversal attacks (CWE-22)
        raw_url = str(request.url)
        if ".." in catchall or ".." in raw_url or "%2e" in raw_url.lower():
            raise HTTPException(status_code=403, detail="Access denied: path traversal attempt detected.")

        safe_base = frontend_path
        target_path = os.path.abspath(os.path.join(safe_base, catchall))
        if not target_path.startswith(safe_base):
            raise HTTPException(status_code=403, detail="Access denied: invalid file path.")
        if os.path.isfile(target_path):
            return FileResponse(target_path)
            
        # Root path serves index.html
        if catchall in ("", "/"):
            index_file = os.path.join(safe_base, "index.html")
            if os.path.isfile(index_file):
                return FileResponse(index_file)
            raise HTTPException(status_code=404, detail="Frontend index.html not found.")
            
        # For subpaths, only serve index.html if the client explicitly requests HTML (browser SPA navigation)
        accept_header = request.headers.get("accept", "")
        _, ext = os.path.splitext(catchall)
        if not ext and "text/html" in accept_header:
            index_file = os.path.join(safe_base, "index.html")
            if os.path.isfile(index_file):
                return FileResponse(index_file)

        raise HTTPException(status_code=404, detail="File not found.")
else:
    logger.warning("Frontend dist directory not found. Please run 'npm run build' in the frontend directory.")

