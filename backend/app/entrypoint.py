from app.main import app as fastapi_app


async def app(scope, receive, send):
    if scope["type"] == "http" and scope.get("path") == "/health":
        body = b'{"status":"ok","service":"Dental Lesion Detection API"}'
        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": [(b"content-type", b"application/json")],
        })
        await send({"type": "http.response.body", "body": body})
        return

    await fastapi_app(scope, receive, send)
