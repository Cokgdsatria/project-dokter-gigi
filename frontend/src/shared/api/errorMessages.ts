export function toFriendlyError(error: unknown, fallback = 'Terjadi kesalahan. Silahkan coba lagi.') {
    const raw = error instanceof Error ? error.message : String(error || fallback);

    if (raw.includes('Network request failed') || raw.includes('Failed to fetch')) {
        return 'Tidak bisa terhubung ke server. Pastikan backend sedang berjalan.';
    }

    if (raw.includes('Internal server error')) {
         return 'Server sedang bermasalah. Coba lagi beberapa saat.';
    }

    if (raw.includes('ROBOFLOW')) {
        return 'Layanan AI belum siap atau konfigurasi Roboflow bermasalah.';
    }

    if (raw.includes('Tipe file tidak didukung')) {
        return 'Format gambar tidak didukung. Gunakan JPG atau PNG.';
    }

    if (raw.includes('Ukuran file terlalu besar')) {
        return 'Ukuran gambar terlalu besar. Gunakan gambar maksimal 10 MB.';
    }
    return raw || fallback;
}