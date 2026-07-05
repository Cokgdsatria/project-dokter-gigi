import os
import subprocess
import sys


def run_prisma_db_push() -> None:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        print("DATABASE_URL is empty; skipping prisma db push", flush=True)
        return

    print("Running prisma db push", flush=True)
    result = subprocess.run(["prisma", "db", "push", "--skip-generate"])
    if result.returncode != 0:
        print(f"prisma db push failed with exit code {result.returncode}; starting API anyway", flush=True)


def start_uvicorn() -> None:
    args = [
        "uvicorn",
        "app.entrypoint:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8080",
        "--lifespan",
        "off",
    ]
    os.execvp(args[0], args)


if __name__ == "__main__":
    try:
        run_prisma_db_push()
    except Exception as exc:
        print(f"prisma db push startup step crashed: {exc}; starting API anyway", file=sys.stderr, flush=True)

    start_uvicorn()