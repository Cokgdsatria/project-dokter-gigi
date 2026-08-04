# Backend Deploy ke Railway

Backend FastAPI dibangun dari Dockerfile. Railway menjalankan sinkronisasi Prisma
sebagai pre-deploy command, lalu menjalankan python app/start.py.

## Environment production wajib

- ENVIRONMENT=production
- DATABASE_URL
- DIRECT_URL
- SECRET_KEY acak, minimal 32 karakter
- CORS_ORIGINS berisi origin web yang diizinkan, bukan wildcard
- ALLOWED_HOSTS berisi hostname Railway/custom domain, bukan wildcard
- ROBOFLOW_API_KEY
- ROBOFLOW_API_URL
- ROBOFLOW_MODEL_ID
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_BUCKET=dental-images

Gunakan nilai berikut agar deployment gagal bila database tidak tersedia:

~~~text
CONNECT_DB_ON_STARTUP=true
REQUIRE_DB_ON_STARTUP=true
~~~

Jangan memasukkan service-role key ke variable Expo. Key tersebut hanya boleh
berada di backend.

## HTTPS frontend

Build preview/production Expo harus menggunakan backend HTTPS:

~~~text
EXPO_PUBLIC_API_BASE_URL=https://<domain-backend>
~~~

src/shared/api/config.ts akan menghentikan build production yang tidak memiliki
URL API atau masih memakai HTTP.

## Prisma dan startup

Urutannya:

1. Docker build menginstal dependency dan menjalankan prisma generate.
2. Railway menjalankan python -m prisma db push --skip-generate.
3. Jika pre-deploy berhasil, Railway menjalankan python app/start.py.
4. Deployment dianggap siap setelah /ready dapat terhubung ke database.

Untuk jangka panjang, pindahkan perubahan schema ke migration versioned dan ganti
pre-deploy command menjadi python -m prisma migrate deploy.

## Pemeriksaan setelah deploy

~~~text
GET https://<domain-backend>/health
GET https://<domain-backend>/ready
~~~

/docs sengaja dinonaktifkan saat ENVIRONMENT=production.

## Worker diagnosis async

Untuk beban production, buat service Railway kedua dari folder backend yang sama:

~~~text
python -m app.worker
~~~

Set DIAGNOSIS_ASYNC_ENABLED=true pada service API setelah worker aktif. API akan
menyimpan job sebagai UPLOADED dan segera merespons; worker mengklaim job secara
atomik dan frontend melakukan polling melalui endpoint history. Beberapa instance
worker dapat dijalankan untuk menambah kapasitas.

Jangan mengaktifkan mode async sebelum service worker berjalan. Development lokal
tetap menggunakan DIAGNOSIS_ASYNC_ENABLED=false dan tidak memerlukan worker.

## Rate limiting

Backend memiliki limiter per proses untuk endpoint auth dan diagnosis. Atur
AUTH_RATE_LIMIT_PER_MINUTE dan DIAGNOSIS_RATE_LIMIT_PER_MINUTE sesuai kebutuhan.
Untuk beberapa instance API, aktifkan rate limiting Cloudflare/API gateway karena
limiter lokal tidak berbagi counter antar-instance.
