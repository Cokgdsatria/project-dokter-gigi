# Project Dokter Gigi

Aplikasi mobile/web CekGigi dengan frontend Expo dan backend FastAPI yang sudah dideploy di Railway.

## Backend Production

Backend production berjalan di Railway:

```text
https://project-dokter-gigi-production.up.railway.app
```

Endpoint pengecekan:

```text
https://project-dokter-gigi-production.up.railway.app/health
https://project-dokter-gigi-production.up.railway.app/ready
```

Jika `/health` menghasilkan `status: ok` dan `/ready` menghasilkan `database: connected`, backend dan database Railway sedang aktif.

## Menjalankan Frontend Lokal dengan Backend Railway

Cara ini hanya menjalankan frontend di laptop. Backend dan database tetap memakai Railway.

### 1. Clone repository

```powershell
git clone https://github.com/Cokgdsatria/project-dokter-gigi.git
cd project-dokter-gigi\frontend
```

### 2. Install dependency frontend

```powershell
npm install
```

### 3. Jalankan frontend dengan URL backend Railway

PowerShell:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="https://project-dokter-gigi-production.up.railway.app"
npx expo start
```

Jika ingin langsung membuka Android emulator:

```powershell
npx expo start --android
```

Jika ingin membuka versi web di browser:

```powershell
npx expo start --web
```

Jika ingin membuka versi web dari HP dalam WiFi yang sama:

```powershell
npx expo start --web --host lan
```

Lalu buka alamat LAN dari browser HP, misalnya:

```text
http://192.168.1.6:8081
```

IP laptop bisa dicek dengan:

```powershell
ipconfig
```

Cari bagian `IPv4 Address`.

## Login dan Register

Saat frontend lokal memakai backend Railway, semua data user tersimpan di database PostgreSQL Railway.

Artinya:

- Akun dari database lokal tidak otomatis ada di Railway.
- Jika belum punya akun di Railway, buat akun baru lewat halaman Sign Up/Register.
- Setelah register berhasil, akun bisa dipakai login dari laptop atau device lain selama memakai backend Railway yang sama.

Contoh akun test bisa dibuat lewat halaman register aplikasi:

```text
Email: satria2@gmail.com
Password: dokter123
```

## Build APK dengan Expo EAS

Jika ada perubahan kode frontend dan ingin membuat APK terbaru:

```powershell
cd project-dokter-gigi\frontend
npx eas-cli build --platform android --profile preview
```

Build `preview` menghasilkan APK internal untuk testing.

## Alur Deploy

### Jika yang berubah backend

1. Commit dan push perubahan backend.
2. Merge ke branch `main`.
3. Railway otomatis build dan deploy.
4. Cek `/health` dan `/ready`.

Frontend tidak perlu rebuild jika URL API dan format response tidak berubah.

### Jika yang berubah frontend

1. Commit dan push perubahan frontend.
2. Merge ke branch `main`.
3. Jalankan EAS build ulang jika ingin APK terbaru:

```powershell
npx eas-cli build --platform android --profile preview
```

### Jika backend dan frontend sama-sama berubah

1. Deploy backend dulu sampai Railway aktif.
2. Pastikan `/health` dan `/ready` berhasil.
3. Build frontend lagi dengan EAS.

## Menjalankan Backend Lokal Opsional

Backend lokal tidak wajib jika hanya ingin memakai backend Railway.

Jika tetap ingin menjalankan backend lokal, masuk ke folder backend:

```powershell
cd project-dokter-gigi\backend
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Isi file `.env` dengan database dan API key yang valid, lalu jalankan:

```powershell
prisma generate
prisma db push
uvicorn app.main:app --reload
```

Untuk mode backend lokal, frontend perlu memakai URL lokal, bukan URL Railway.

## Catatan Environment

Frontend membaca URL backend dari environment variable:

```text
EXPO_PUBLIC_API_BASE_URL
```

Untuk penggunaan normal dengan backend Railway, isi nilainya:

```text
https://project-dokter-gigi-production.up.railway.app
```

Jangan commit file `.env` yang berisi secret/API key production.
