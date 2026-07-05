fastapi_app = None


async def _get_fastapi_app():
    global fastapi_app

    if fastapi_app is None:
        from app.main import app

        fastapi_app = app

    return fastapi_app


async def app(scope, receive, send):
    if scope["type"] == "lifespan":
        while True:
            message = await receive()
            if message["type"] == "lifespan.startup":
                await send({"type": "lifespan.startup.complete"})
            elif message["type"] == "lifespan.shutdown":
                await send({"type": "lifespan.shutdown.complete"})
                return

    if scope["type"] == "http" and scope.get("path") == "/health":
        body = b'{"status":"ok","service":"Dental Lesion Detection API"}'
        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": [(b"content-type", b"application/json")],
        })
        await send({"type": "http.response.body", "body": body})
        return

    main_app = await _get_fastapi_app()
    await main_app(scope, receive, send)