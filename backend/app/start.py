import os


def start_uvicorn() -> None:
    port = os.getenv("PORT", "8080")
    args = [
        "uvicorn",
        "app.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        port,
        "--proxy-headers",
        "--forwarded-allow-ips",
        "*",
    ]
    os.execvp(args[0], args)


if __name__ == "__main__":
    start_uvicorn()
