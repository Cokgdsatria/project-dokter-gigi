# Backend Deploy ke Railway

Folder ini disiapkan untuk deploy backend FastAPI ke Railway memakai Nixpacks.

## File deploy

- `Procfile`: start command production untuk FastAPI.
- `nixpacks.toml`: setup Python + Node, install dependency, dan menjalankan `prisma generate`.
- `.env.example`: template environment variables untuk Railway.

## Environment variables wajib di Railway

- `DATABASE_URL`
- `SECRET_KEY`
- `ROBOFLOW_API_KEY`
- `ROBOFLOW_API_URL`
- `ROBOFLOW_MODEL_ID`
- `CORS_ORIGINS`

## Environment variables opsional

- `MAX_UPLOAD_BYTES`
- `ALLOWED_IMAGE_MIME`
- `DEBUG`
- `DEBUG_RUN_ID`
- `DEBUG_SERVER_URL`
- `DEBUG_SESSION_ID`

## Start command

Railway bisa memakai `Procfile` atau `nixpacks.toml` yang sudah ada. Command production:

```bash
prisma generate && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Prisma

Project ini memakai `prisma-client-py`, jadi build perlu menjalankan:

```bash
prisma generate
```

Sesudah `DATABASE_URL` diarahkan ke Postgres Railway, sinkronkan schema database dengan salah satu command berikut dari environment yang sesuai:

```bash
prisma db push
```

Atau, kalau nanti migrasi resmi sudah dipakai:

```bash
prisma migrate deploy
```

## Health check

Endpoint health check tersedia di:

```text
/health
```
