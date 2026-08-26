# SIMFONI — Sistem Monitoring Fenomena Ekonomi

Dashboard monitoring fenomena ekonomi untuk BPS Kabupaten Raja Ampat. Dibangun
mengikuti dokumen analisis kebutuhan & mockup dashboard yang dilampirkan,
dengan revisi tata letak & fitur terbaru.

## Kenapa stack ini

| Kebutuhan | Pilihan | Alasan |
|---|---|---|
| Framework web | **Next.js 14 (App Router)** | Gratis, open-source, satu framework untuk frontend + backend (API routes). |
| Styling | **Tailwind CSS** | Cepat mereplikasi desain mockup dengan presisi, tanpa CSS terpisah. |
| Database | **SQLite (better-sqlite3)** | Gratis, zero-config, satu file (`data/simfoni.db`). |
| Grafik | **Recharts** | Library chart React gratis & ringan. |
| Scraping portal berita | **RSS (rss-parser)** | Resmi disediakan tiap portal, jauh lebih stabil daripada scraping HTML mentah, dan menyertakan jam publikasi. |
| Scraping Instagram/Facebook | **Meta Graph API resmi** | Satu-satunya cara resmi & legal untuk mengambil data dari akun Instagram Business/Facebook Page. |
| Export laporan | **ExcelJS + PDFKit** | Gratis & open-source. |
| Import data massal | **ExcelJS (server-side)** | Membaca file .xlsx yang diunggah lewat pop-up "Tambah Pendataan". |
| Autentikasi | **Tidak ada (sesuai permintaan)** | Website sederhana tanpa login. |

## Menjalankan secara lokal

```bash
npm install
npm run seed      # isi data master (sektor, distrik, indikator BPS) + contoh fenomena
npm run dev        # buka http://localhost:3000
```

## Halaman & alur terbaru

- `/` — **Dashboard**: ringkasan, grafik, fenomena terbaru, lalu (sesuai urutan revisi)
  Sektor Ekonomi Teratas + Sebaran per Distrik, Peta Sebaran (dengan statistik
  jumlah fenomena per sektor per wilayah + filter distrik), dan terakhir
  Distribusi Sentimen + Sumber Data.
- `/fenomena` — Monitoring & pencarian seluruh fenomena. Berisi juga box
  **"Sinkronkan Data Otomatis"** (portal berita & Instagram/Facebook) yang
  sebelumnya ada di halaman Pendataan.
- `/fenomena/[id]` — Detail fenomena, validasi (dengan pop-up konfirmasi),
  kaitan indikator BPS.
- **Tombol "Tambah Pendataan"** (di Dashboard & halaman Fenomena) membuka
  **pop-up** berisi dua tab: Formulir Manual (dengan pop-up konfirmasi saat
  disimpan) dan **Import Excel** (unggah .xlsx berisi banyak baris sekaligus).
- **Tombol "Unduh Laporan"** (di Dashboard) membuka **pop-up** filter +
  unduh PDF/Excel (dengan pop-up konfirmasi sebelum file diunduh).

Halaman `/pendataan` dan `/laporan` yang terpisah sudah dihapus — kedua
fungsi tersebut kini berupa pop-up modal agar navigasi lebih ringkas.

## Kolom template Excel untuk import massal

Baris header (urutan bebas, tidak peka huruf besar/kecil):

```
Judul | Tanggal | Uraian | Sektor | Distrik | Penyebab | Dampak | Nama Sumber | Penulis
```

Kolom **Judul, Tanggal, Uraian, Sektor, Distrik** wajib diisi; baris yang
tidak lengkap akan dilewati (dihitung sebagai "skipped"). Semua baris yang
berhasil diimpor otomatis berstatus **Draft**.

## Relevansi Raja Ampat & jam kejadian

Ketiga jenis sumber data (portal berita, media sosial, input pendataan)
mengikuti aturan berikut:

- **Portal berita & media sosial** (`lib/newsScraper.js`, `lib/metaApi.js`):
  hanya konten yang menyebut Raja Ampat/distriknya (Waisai, Salawati, Misool,
  Batanta, Kofiau, dst — lihat `isRajaAmpatRelated` di `lib/textmining.js`)
  yang disimpan; selain itu dilewati otomatis.
- **Jam kejadian/publikasi** ikut disimpan (bukan hanya tanggal): RSS dan
  Graph API sudah menyertakan timestamp lengkap, dan form pendataan manual
  memakai input `datetime-local` agar jam ikut tercatat. Tampilan tanggal di
  seluruh UI dan laporan memakai `lib/format.js` yang selalu menampilkan
  tanggal + jam.

## Menghubungkan Meta Graph API (Instagram & Facebook)

1. Buat Meta App di https://developers.facebook.com/apps (gratis).
2. Aktifkan produk **Instagram Graph API** dan **Facebook Login for Business**.
3. Tautkan akun Instagram Business/Creator ke Halaman Facebook resmi
   instansi, lalu ambil **Page Access Token** jangka panjang dari Graph API
   Explorer.
4. Salin `.env.example` menjadi `.env.local`, isi `META_ACCESS_TOKEN`.
5. Tambahkan akun yang ingin dipantau ke tabel `sumber` (lihat
   `scripts/seed.js` sebagai contoh, ganti `identifier` dengan Instagram
   Business Account ID / Facebook Page ID sungguhan).
6. Jalankan `npm run scrape:meta`, atau klik tombol **"Sinkron Instagram &
   Facebook"** di halaman Fenomena.

## Aturan bisnis yang diterapkan di kode

Lihat `lib/fenomenaRepo.js`:
- Status awal fenomena selalu **Draft**.
- Fenomena berstatus **Digunakan** tidak dapat dihapus (riwayat publikasi
  terjaga) — pop-up penghapusan akan menampilkan pesan galat bila dicoba.
- Satu fenomena dapat dikaitkan ke banyak indikator statistik BPS.
- Setiap tombol aksi penting (simpan pendataan, import Excel, unduh laporan,
  verifikasi/tolak fenomena, ubah status, hapus fenomena) menampilkan pop-up
  konfirmasi terlebih dahulu — lihat `components/ConfirmDialog.jsx`.

## Struktur folder

```
app/                  # Halaman & API routes (Next.js App Router)
components/           # Komponen UI, termasuk Modal.jsx & ConfirmDialog.jsx
lib/                  # Akses database, text mining, scraper Meta & RSS, format tanggal
scripts/              # Seed data & pemicu scraping via CLI/cron
data/                 # File database SQLite (dibuat otomatis)
```

## Meningkatkan lebih lanjut (opsional, semuanya gratis)

- **Peta interaktif sungguhan**: ganti ilustrasi di `components/PetaSebaran.jsx`
  dengan `react-leaflet` + tile OpenStreetMap.
- **Text mining lebih akurat**: ganti `lib/textmining.js` dengan model
  IndoBERT gratis lewat HuggingFace Inference API.
- **Penjadwalan otomatis**: jalankan `npm run scrape:news` dan
  `npm run scrape:meta` lewat cron job di server.
- **Deploy gratis**: Vercel (Next.js) untuk pemakaian internal instansi.
  Karena SQLite berbasis file, gunakan volume persisten (Fly.io/Railway free
  tier), atau pindah ke database terkelola gratis seperti Turso/Neon bila
  di-deploy sebagai serverless murni.
