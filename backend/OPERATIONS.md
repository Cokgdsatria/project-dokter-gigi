# Operations Runbook

## Backup database

1. Aktifkan backup terjadwal atau Point in Time Recovery pada project Supabase
   sesuai paket yang digunakan.
2. Sebelum perubahan schema besar, buat dump manual menggunakan DIRECT_URL.
3. Simpan dump terenkripsi di lokasi yang berbeda dari project Supabase utama.
4. Jangan commit dump karena berisi data dokter dan pasien.

Contoh dump manual dari PowerShell:

~~~powershell
pg_dump --format=custom --no-owner --no-acl --dbname="$env:DIRECT_URL" --file="cekgigi.dump"
~~~

## Uji restore

Backup belum dianggap valid sebelum pernah direstore:

1. Buat database sementara yang terisolasi.
2. Restore dump dengan pg_restore.
3. Jalankan python -m prisma validate.
4. Verifikasi jumlah User, Patient, Homebase, dan ScanHistory.
5. Verifikasi relasi scan ke dokter, pasien, dan homebase tidak putus.
6. Hapus database sementara setelah hasil dicatat.

Jalankan latihan restore minimal sekali per bulan dan sebelum rilis besar.

## Backup X-ray private

Bucket dental-images wajib tetap private. Salin object secara terjadwal ke
bucket/project cadangan dengan kredensial backend terpisah. Setelah penyalinan:

1. Bandingkan jumlah object sumber dan cadangan.
2. Ambil sampel object dan verifikasi checksum.
3. Pastikan bucket cadangan juga tidak public.
4. Uji proses restore ke prefix sementara.

Database menyimpan imageObjectPath, bukan URL publik. Saat restore lintas bucket,
pertahankan object path yang sama.

## Pemeliharaan refresh token

Jalankan berkala, misalnya mingguan:

~~~powershell
python -m scripts.purge_refresh_tokens --retention-days 30
~~~

Script hanya menghapus token yang sudah kedaluwarsa atau sudah dicabut dan lebih
lama dari masa retensi.

## Pemeriksaan insiden

- /health memeriksa proses API.
- /ready memeriksa koneksi database.
- Jangan tulis access token, refresh token, password, service-role key, atau signed
  image URL ke log.
- Jika refresh-token reuse terdeteksi, seluruh token aktif dalam keluarga tersebut
  dicabut. Pengguna harus login ulang.
