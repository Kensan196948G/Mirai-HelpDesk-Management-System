"""
Development Server Runner

Starts both backend API and frontend static server.
"""

import subprocess
import sys
import time
from pathlib import Path


def run_backend():
    """Run FastAPI backend server."""
    print("🚀 Starting Backend API server...")
    backend_dir = Path(__file__).parent.parent / "backend"
    
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
        cwd=backend_dir,
    )


def run_frontend():
    """Run frontend static server."""
    print("🌐 Starting Frontend server...")
    frontend_dir = Path(__file__).parent.parent / "frontend"
    
    return subprocess.Popen(
        [sys.executable, "-m", "http.server", "8080"],
        cwd=frontend_dir,
    )


def main():
    """Start both servers."""
    print("=" * 50)
    print("Mirai HelpDesk - Development Server")
    print("=" * 50)
    
    backend = run_backend()
    time.sleep(2)  # Wait for backend to start
    frontend = run_frontend()
    
    print("\n✅ Servers running:")
    print("  - Backend API: http://localhost:8000")
    print("  - API Docs: http://localhost:8000/api/docs")
    print("  - Frontend: http://localhost:8080")
    print("\nPress Ctrl+C to stop.")
    
    try:
        backend.wait()
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
        backend.terminate()
        frontend.terminate()


if __name__ == "__main__":
    main()
