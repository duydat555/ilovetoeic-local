import multiprocessing
import os

# Server socket
host = os.getenv("HOST", "127.0.0.1")
port = os.getenv("PORT", "8000")
bind = f"{host}:{port}"

# Worker processes
# Production safety: Ubuntu VPS has constrained RAM (documented in docs/agents/deployment.md).
# Default to 2-4 workers or configurable via WEB_CONCURRENCY.
cpu_count = multiprocessing.cpu_count()
default_workers = min(4, max(2, cpu_count))
workers = int(os.getenv("WEB_CONCURRENCY", default_workers))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = int(os.getenv("WORKER_CONNECTIONS", "1000"))

# Timeouts & Keep-alive
timeout = int(os.getenv("GUNICORN_TIMEOUT", "60"))
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "5"))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT", "30"))

# Worker recycling to prevent memory bloat over time
max_requests = int(os.getenv("GUNICORN_MAX_REQUESTS", "5000"))
max_requests_jitter = int(os.getenv("GUNICORN_MAX_REQUESTS_JITTER", "500"))

# Logging
accesslog = os.getenv("GUNICORN_ACCESS_LOG", "-")
errorlog = os.getenv("GUNICORN_ERROR_LOG", "-")
loglevel = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)sµs'

# Lifecycle Hooks
def on_starting(server):
    server.log.info("Starting Gunicorn with Uvicorn workers for TOEICMaster Backend")
    server.log.info(f"Binding to {bind} with {workers} worker processes")

def post_worker_init(worker):
    worker.log.info(f"Worker spawned (pid: {worker.pid})")

def worker_exit(server, worker):
    server.log.info(f"Worker exiting (pid: {worker.pid})")
