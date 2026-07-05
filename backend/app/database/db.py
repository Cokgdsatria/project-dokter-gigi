import asyncio

from prisma import Prisma

db = Prisma()
_connect_lock = asyncio.Lock()
_is_connected = False


async def connect_db() -> None:
    global _is_connected

    if _is_connected:
        return

    async with _connect_lock:
        if _is_connected:
            return

        await db.connect()
        _is_connected = True


async def disconnect_db() -> None:
    global _is_connected

    if not _is_connected:
        return

    await db.disconnect()
    _is_connected = False