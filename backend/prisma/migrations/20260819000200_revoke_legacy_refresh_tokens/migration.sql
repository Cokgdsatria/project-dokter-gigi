-- Existing sessions predate the absolute session lifetime and cannot be bounded safely.
UPDATE "RefreshToken"
SET "revokedAt" = CURRENT_TIMESTAMP
WHERE "revokedAt" IS NULL;
