import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.config import settings
from app.core.security import generate_refresh_token, hash_refresh_token
from app.database.db import db


class RefreshTokenError(Exception):
    pass


@dataclass
class RefreshTokenResult:
    raw_token: str
    user: object


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _new_refresh_token_values(
    user_id: str,
    family_id: Optional[str] = None,
):
    raw_token = generate_refresh_token()
    return raw_token, {
        "tokenHash": hash_refresh_token(raw_token),
        "familyId": family_id or str(uuid.uuid4()),
        "userId": user_id,
        "expiresAt": datetime.now(timezone.utc)
        + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    }


async def issue_refresh_token(user_id: str, client=None) -> str:
    database = client or db
    raw_token, values = _new_refresh_token_values(user_id)
    await database.refreshtoken.create(data=values)
    return raw_token


async def rotate_refresh_token(raw_token: str) -> RefreshTokenResult:
    token_hash = hash_refresh_token(raw_token)
    now = datetime.now(timezone.utc)
    rejection_message: Optional[str] = None
    result: Optional[RefreshTokenResult] = None

    async with db.tx(timeout=10000) as transaction:
        stored = await transaction.refreshtoken.find_unique(
            where={"tokenHash": token_hash},
            include={"user": True},
        )
        if stored is None:
            raise RefreshTokenError("Refresh token tidak valid")

        if stored.revokedAt is not None:
            await transaction.refreshtoken.update_many(
                where={"familyId": stored.familyId, "revokedAt": None},
                data={"revokedAt": now},
            )
            rejection_message = "Refresh token sudah pernah digunakan"
        elif _as_utc(stored.expiresAt) <= now:
            await transaction.refreshtoken.update(
                where={"id": stored.id},
                data={"revokedAt": now},
            )
            rejection_message = "Refresh token sudah kedaluwarsa"
        else:
            next_raw_token, next_values = _new_refresh_token_values(
                stored.userId,
                family_id=stored.familyId,
            )
            await transaction.refreshtoken.update(
                where={"id": stored.id},
                data={
                    "revokedAt": now,
                    "replacedByTokenHash": next_values["tokenHash"],
                },
            )
            await transaction.refreshtoken.create(data=next_values)
            result = RefreshTokenResult(raw_token=next_raw_token, user=stored.user)

    # Raise only after the transaction commits the revocation.
    if rejection_message is not None:
        raise RefreshTokenError(rejection_message)
    if result is None:
        raise RefreshTokenError("Refresh token tidak valid")
    return result


async def revoke_refresh_token(raw_token: str) -> None:
    token_hash = hash_refresh_token(raw_token)
    stored = await db.refreshtoken.find_unique(where={"tokenHash": token_hash})
    if stored is None:
        return

    await db.refreshtoken.update_many(
        where={"familyId": stored.familyId, "revokedAt": None},
        data={"revokedAt": datetime.now(timezone.utc)},
    )


async def revoke_all_user_refresh_tokens(user_id: str) -> int:
    return await db.refreshtoken.update_many(
        where={"userId": user_id, "revokedAt": None},
        data={"revokedAt": datetime.now(timezone.utc)},
    )
