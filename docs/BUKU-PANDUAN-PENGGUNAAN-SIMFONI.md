# BUKU PANDUAN PENGGUNAAN SIMFONI

## Sistem Monitoring Fenomena Ekonomi
### BPS Kabupaten Raja Ampat

**Versi:** 1.0  
**Sistem:** SIMFONI — Sistem Monitoring Fenomena Ekonomi  
**Platform:** Web  
**Sasaran pengguna:** Tim Distribusi/Petugas Pendataan dan Tim Neraca

---

# KATA PENGANTAR

Buku panduan ini disusun sebagai petunjuk penggunaan SIMFONI (Sistem Monitoring Fenomena Ekonomi), yaitu dashboard yang digunakan untuk menghimpun, memantau, mengelola, memvalidasi, dan menyajikan fenomena ekonomi Kabupaten Raja Ampat.

Panduan ini dibuat berdasarkan struktur dan fungsi yang tersedia pada aplikasi SIMFONI. Isi panduan berfokus pada penggunaan aplikasi oleh pengguna, bukan pada pengembangan program.

---

# DAFTAR ISI

1. Mengenal SIMFONI
2. Tujuan dan Manfaat
3. Pengguna dan Hak Akses
4. Memulai SIMFONI
5. Dashboard
6. Menambah Fenomena Secara Manual
7. Import Fenomena melalui Excel
8. Sinkronisasi Data Otomatis
9. Monitoring dan Pencarian Fenomena
10. Filter, Pencarian, Pengurutan, dan Pagination
11. Melihat Detail Fenomena
12. Validasi oleh Tim Neraca
13. Fenomena yang Terindikasi Mirip
14. Menghapus Fenomena
15. Mengunduh Laporan
16. Alur Kerja Penggunaan SIMFONI
17. Status Data
18. Ketentuan Pengisian Data
19. Penanganan Masalah Umum
20. Ringkasan Penggunaan

---

# 1. MENGENAL SIMFONI

SIMFONI adalah dashboard monitoring fenomena ekonomi Kabupaten Raja Ampat. Sistem dirancang untuk mengurangi proses pencarian dan rekapitulasi fenomena yang sebelumnya dilakukan secara manual.

SIMFONI menggabungkan beberapa sumber data, antara lain:

- Pendataan manual oleh petugas/tim.
- Import data fenomena melalui Excel.
- Portal berita yang disinkronkan secara otomatis.
- Instagram dan Facebook resmi yang terdaftar pada sistem.
- Informasi sektor PDRB dan distrik.
- Indikator statistik BPS yang dapat dikaitkan dengan fenomena.

Secara teknis, aplikasi menggunakan Next.js dengan App Router, Tailwind CSS, dan database SQLite. Struktur aplikasi memisahkan halaman/API pada folder `app`, komponen antarmuka pada `components`, fungsi pengolahan data pada `lib`, serta script operasional pada `scripts`.

---

# 2. TUJUAN DAN MANFAAT

## 2.1 Tujuan

SIMFONI digunakan untuk:

1. Menghimpun fenomena ekonomi secara terstruktur.
2. Memantau perkembangan fenomena ekonomi Kabupaten Raja Ampat.
3. Mengelompokkan fenomena berdasarkan sektor PDRB, distrik, sentimen, sumber, dan periode.
4. Membantu Tim Neraca melakukan validasi fenomena.
5. Mengidentifikasi fenomena yang memiliki kemiripan.
6. Menghubungkan fenomena dengan indikator statistik BPS.
7. Menghasilkan laporan dalam format Excel dan PDF.

## 2.2 Manfaat

Dengan SIMFONI, proses yang sebelumnya tersebar dapat dilakukan dalam satu sistem sehingga data lebih mudah dicari, ditelusuri, diperbarui, divalidasi, dan direkap.

---

# 3. PENGGUNA DAN HAK AKSES

SIMFONI memiliki dua kelompok pengguna utama.

## 3.1 Tim Distribusi / Petugas Pendataan

Digunakan untuk:

- Mencatat fenomena hasil pengamatan lapangan.
- Mengisi data fenomena secara manual.
- Melakukan import data dalam jumlah banyak melalui Excel.
- Memantau fenomena yang telah tercatat.
- Melihat detail fenomena.

Data yang dimasukkan melalui pendataan manual atau import Excel pada prinsipnya masuk sebagai **Draft/Tercatat** dan menunggu proses validasi.

## 3.2 Tim Neraca

Digunakan untuk:

- Membuka halaman monitoring fenomena.
- Memeriksa detail fenomena.
- Memeriksa sektor PDRB dan distrik.
- Memeriksa fenomena yang terindikasi mirip.
- Mengubah status fenomena menjadi Terverifikasi atau kembali menjadi Draft.
- Menghapus fenomena apabila diperlukan.

Akses fungsi validasi dan penghapusan pada halaman fenomena dilindungi dengan PIN Tim Neraca.

> **Catatan:** SIMFONI pada versi ini tidak menggunakan sistem login akun. Akses fungsi Tim Neraca menggunakan mekanisme PIN yang tersedia di aplikasi.

---

# 4. MEMULAI SIMFONI

## 4.1 Membuka aplikasi

Buka alamat SIMFONI yang telah diberikan oleh pengelola sistem.

Jika aplikasi dijalankan secara lokal oleh pengelola:

```bash
npm install
npm run seed
npm run dev
```

Kemudian buka:

```text
http://localhost:3000
```

Aplikasi membutuhkan Node.js versi 18 atau lebih tinggi.

## 4.2 Halaman utama

Setelah aplikasi dibuka, pengguna akan masuk ke **Dashboard Fenomena Ekonomi**.

Dashboard merupakan halaman ringkasan untuk melihat kondisi data fenomena secara cepat.

---

# 5. DASHBOARD

Dashboard merupakan pusat informasi SIMFONI.

Pada dashboard tersedia:

1. **Total Fenomena**
2. **Kondisi PDRB**
3. **Fenomena Terbaru**
4. **Fenomena per Bulan**
5. **Tren Sentimen**
6. **Sektor Ekonomi Teratas**
7. **Sebaran Distrik**
8. **Distribusi Sentimen**
9. **Sumber Data**
10. Tombol **Tambah Fenomena**
11. Tombol **Unduh Laporan**
12. Filter periode

## 5.1 Total Fenomena

Menampilkan jumlah fenomena pada periode yang dipilih, termasuk jumlah data yang masih tercatat/Draft dan jumlah yang telah Terverifikasi.

## 5.2 Kondisi PDRB

Memberikan ringkasan kondisi berdasarkan fenomena dan sentimen pada periode terpilih.

Label kondisi yang digunakan antara lain:

- **Tumbuh**
- **Stagnan**
- **Kontraksi**
- **Tidak ada data**

## 5.3 Fenomena Terbaru

Menampilkan fenomena yang paling baru berdasarkan data yang tersedia.

## 5.4 Fenomena per Bulan

Menampilkan perkembangan jumlah fenomena berdasarkan waktu.

## 5.5 Tren Sentimen

Menampilkan perkembangan sentimen fenomena dari waktu ke waktu.

Sentimen yang digunakan:

- Positif
- Netral
- Negatif

## 5.6 Sektor Ekonomi Teratas

Menampilkan sektor PDRB dengan jumlah fenomena terbanyak pada periode yang dipilih.

## 5.7 Sebaran Distrik

Menampilkan jumlah fenomena berdasarkan distrik.

## 5.8 Filter periode

Dashboard dapat difilter berdasarkan:

- Semua data
- Triwulan
- Tahun

Filter periode akan memengaruhi informasi statistik yang ditampilkan pada dashboard.

---

# 6. MENAMBAH FENOMENA SECARA MANUAL

Fungsi ini digunakan untuk memasukkan fenomena hasil pendataan lapangan satu per satu.

## 6.1 Membuka formulir

1. Buka **Dashboard** atau halaman **Fenomena**.
2. Klik **Tambah Fenomena**.
3. Pilih tab **Formulir Manual**.

## 6.2 Mengisi formulir

Isi informasi berikut:

| Kolom | Keterangan | Wajib |
|---|---|---|
| Judul Fenomena | Judul singkat fenomena | Ya |
| Tanggal Kejadian | Tanggal terjadinya fenomena | Ya |
| Nama Petugas / Tim | Nama petugas atau tim pencatat | Ya |
| Uraian | Penjelasan fenomena | Ya |
| Penyebab | Faktor penyebab fenomena | Tidak |
| Dampak | Dampak fenomena terhadap ekonomi | Tidak |
| Sektor PDRB | Sektor ekonomi terkait | Ya |
| Distrik / Lokasi | Distrik tempat fenomena terjadi | Ya |

## 6.3 Menyimpan data

Setelah semua kolom wajib diisi:

1. Klik **Simpan Fenomena**.
2. Baca dialog konfirmasi.
3. Klik **Ya, simpan** jika data sudah benar.
4. Sistem menyimpan fenomena sebagai **Draft/Tercatat**.
5. Data selanjutnya dapat diperiksa dan divalidasi oleh Tim Neraca.

## 6.4 Ketentuan tanggal

Tanggal kejadian dibatasi pada rentang tahun yang diizinkan oleh aplikasi, yaitu tahun berjalan dan satu tahun sebelumnya.

Jika tanggal berada di luar rentang tersebut, sistem akan menolak penyimpanan dan meminta pengguna memperbaiki tanggal.

---

# 7. IMPORT FENOMENA MELALUI EXCEL

Fungsi Import Excel digunakan apabila pengguna ingin memasukkan banyak fenomena sekaligus.

## 7.1 Mengunduh template

1. Klik **Tambah Fenomena**.
2. Pilih tab **Import Excel**.
3. Klik **Unduh Template Excel**.
4. Gunakan template tersebut sebagai dasar pengisian data.

## 7.2 Kolom template

Template import menggunakan kolom fenomena seperti berikut:

```text
Judul
Tanggal
Uraian
Sektor
Distrik
Penyebab
Dampak
Petugas
```

Untuk menjaga kompatibilitas, gunakan template yang disediakan oleh aplikasi dan jangan mengubah nama/struktur kolomnya.

## 7.3 Mengisi Excel

Setiap baris mewakili satu fenomena.

Contoh:

| Judul | Tanggal | Uraian | Sektor | Distrik | Penyebab | Dampak | Petugas |
|---|---|---|---|---|---|---|---|
| Aktivitas wisata meningkat | 2026-08-10 | Kunjungan wisatawan meningkat | Penyediaan Akomodasi dan Makan Minum | Kota Waisai | Musim liburan | Peningkatan aktivitas usaha | Tim Distribusi |

## 7.4 Melakukan import

1. Buka **Tambah Fenomena**.
2. Pilih **Import Excel**.
3. Klik pilihan file Excel.
4. Pilih file `.xlsx` yang sudah diisi.
5. Pastikan nama file yang dipilih sudah benar.
6. Klik **Import Data**.
7. Baca dialog konfirmasi.
8. Klik **Ya, import**.

Sistem akan menampilkan hasil import, termasuk:

- Jumlah baris yang berhasil dimasukkan.
- Jumlah baris yang dilewati.
- Jumlah baris contoh yang diabaikan jika ada.
- Jumlah baris yang berada di luar rentang tahun.

Semua data yang berhasil diimport akan berstatus **Draft/Tercatat**.

## 7.5 Jika import gagal

Jika sistem menampilkan pesan bahwa format file tidak sesuai template:

1. Unduh ulang template dari aplikasi.
2. Salin data ke template tersebut.
3. Jangan mengubah nama kolom.
4. Simpan sebagai `.xlsx`.
5. Ulangi proses import.

---

# 8. SINKRONISASI DATA OTOMATIS

SIMFONI menyediakan sinkronisasi data dari sumber eksternal yang telah dikonfigurasi.

Pada halaman **Fenomena**, tersedia bagian **Sinkronkan Data Otomatis**.

## 8.1 Sinkron portal berita

Klik:

**Sinkron Portal Berita**

Sistem akan mengambil data dari portal berita yang telah dikonfigurasi, kemudian memprosesnya untuk mencari konten yang berkaitan dengan Raja Ampat.

Sistem dapat melewati data yang:

- tidak relevan dengan Raja Ampat;
- merupakan duplikat;
- tidak memenuhi aturan pemrosesan yang tersedia.

## 8.2 Sinkron Instagram dan Facebook

Klik:

**Sinkron Instagram & Facebook**

Fungsi ini digunakan untuk mengambil konten dari akun Instagram Business/Creator dan Facebook Page yang telah dikonfigurasi menggunakan Meta Graph API.

## 8.3 Hasil sinkronisasi

Setelah proses selesai, aplikasi dapat menampilkan:

- jumlah data baru;
- jumlah data yang terindikasi mirip dengan data lain;
- jumlah data yang dilewati;
- waktu sinkronisasi terakhir.

## 8.4 Catatan sumber data

Sinkronisasi hanya dapat berjalan apabila sumber dan konfigurasi API sudah tersedia pada sistem. Pengguna biasa tidak perlu mengubah konfigurasi tersebut; perubahan sumber dilakukan oleh pengelola sistem.

---

# 9. MONITORING DAN PENCARIAN FENOMENA

Buka halaman:

**Fenomena**

Halaman ini digunakan untuk melihat seluruh fenomena yang tersimpan dalam sistem.

Daftar fenomena dapat digunakan untuk:

- mencari fenomena;
- menyaring berdasarkan sektor;
- menyaring berdasarkan distrik;
- menyaring berdasarkan status;
- menyaring berdasarkan periode;
- mengurutkan data;
- melihat detail;
- memeriksa fenomena yang mirip;
- melakukan validasi oleh Tim Neraca.

---

# 10. FILTER, PENCARIAN, PENGURUTAN, DAN PAGINATION

## 10.1 Pencarian

Masukkan kata yang ingin dicari pada kolom pencarian.

Pencarian dapat menemukan informasi berdasarkan bagian data fenomena seperti judul, uraian, lokasi, atau kata kunci yang tersedia.

## 10.2 Filter sektor

Gunakan filter **Sektor** untuk menampilkan fenomena dari sektor PDRB tertentu.

## 10.3 Filter distrik

Gunakan filter **Distrik** untuk menampilkan fenomena berdasarkan lokasi.

## 10.4 Filter status

Status yang tersedia:

- Draft/Tercatat
- Terverifikasi

## 10.5 Filter periode

Gunakan filter periode untuk membatasi fenomena berdasarkan rentang waktu.

## 10.6 Pengurutan

Data dapat diurutkan berdasarkan kolom tertentu seperti:

- Judul
- Sektor
- Sentimen
- Status
- Tanggal

Klik judul kolom untuk mengubah arah pengurutan.

## 10.7 Jumlah baris

Pengguna dapat memilih jumlah data yang ditampilkan dalam satu halaman. Pilihan yang tersedia pada aplikasi meliputi:

- 10
- 15
- 25
- 50

Gunakan tombol navigasi halaman untuk berpindah ke halaman berikutnya atau sebelumnya.

---

# 11. MELIHAT DETAIL FENOMENA

Untuk melihat informasi lengkap:

1. Buka halaman **Fenomena**.
2. Klik fenomena yang ingin diperiksa.
3. Sistem membuka halaman detail.

Informasi yang dapat ditampilkan meliputi:

- Judul fenomena.
- Tanggal.
- Sektor.
- Distrik.
- Sumber.
- Sentimen.
- Status.
- Uraian.
- Penyebab.
- Dampak.
- Kata kunci.
- Tautan sumber asli jika tersedia.
- Informasi kemiripan jika terdeteksi.
- Informasi klasifikasi dan keterkaitan indikator apabila tersedia.

Jika terdapat sumber asli, klik **Buka sumber asli** untuk melihat sumber tersebut.

---

# 12. VALIDASI OLEH TIM NERACA

Validasi merupakan tahap penting untuk memastikan fenomena yang digunakan dalam monitoring telah diperiksa oleh Tim Neraca.

## 12.1 Membuka akses Tim Neraca

Ketika halaman Fenomena dibuka tanpa akses Tim Neraca, sistem menampilkan halaman khusus Tim Neraca.

Klik:

**Buka dengan PIN**

Masukkan PIN Tim Neraca yang telah ditetapkan oleh pengelola sistem.

## 12.2 Memeriksa fenomena

Sebelum melakukan validasi, periksa:

1. Judul fenomena.
2. Tanggal kejadian.
3. Uraian.
4. Penyebab dan dampak jika tersedia.
5. Sektor PDRB.
6. Distrik/lokasi.
7. Sumber informasi.
8. Sentimen.
9. Indikator BPS yang berkaitan jika tersedia.
10. Indikasi fenomena mirip.

## 12.3 Mengubah status

Pada bagian **Validasi Fenomena** tersedia pilihan:

- Draft
- Terverifikasi

Untuk mengubah status:

1. Pastikan akses Tim Neraca sudah dibuka.
2. Pilih status yang sesuai.
3. Baca konfirmasi.
4. Klik **Ya, ubah**.

### Terverifikasi

Pilih **Terverifikasi** apabila fenomena telah diperiksa dan dinilai layak digunakan sebagai fenomena yang tervalidasi.

### Draft

Pilih **Draft** apabila fenomena masih perlu diperiksa, diperbaiki, atau belum memenuhi kriteria untuk diverifikasi.

---

# 13. FENOMENA YANG TERINDIKASI MIRIP

SIMFONI memiliki mekanisme untuk mendeteksi fenomena yang memiliki kemiripan judul/data.

Jika sebuah fenomena terindikasi mirip, halaman detail dapat menampilkan peringatan seperti:

> Fenomena ini terindikasi mirip dengan fenomena lain. Periksa kembali sebelum diverifikasi.

## 13.1 Yang harus dilakukan Tim Neraca

Jika peringatan muncul:

1. Buka fenomena yang ditunjukkan.
2. Bandingkan judul dan tanggal.
3. Periksa apakah keduanya merupakan kejadian yang sama.
4. Periksa sumber informasi.
5. Tentukan apakah data merupakan duplikat atau fenomena yang berbeda.
6. Lanjutkan validasi setelah pemeriksaan selesai.

Tujuannya adalah menghindari satu kejadian ekonomi dihitung sebagai beberapa fenomena yang sama.

---

# 14. MENGHAPUS FENOMENA

Penghapusan hanya dapat dilakukan oleh pengguna yang telah membuka akses Tim Neraca.

## 14.1 Prosedur

1. Buka detail fenomena.
2. Pastikan data yang akan dihapus sudah benar.
3. Klik **Hapus fenomena ini**.
4. Baca peringatan penghapusan.
5. Klik **Ya, hapus**.
6. Sistem menghapus data setelah server mengonfirmasi bahwa proses berhasil.

> **Perhatian:** Penghapusan bersifat permanen dan tidak dapat dibatalkan dari antarmuka aplikasi.

Jika fenomena sedang digunakan atau memiliki kondisi yang mencegah penghapusan, sistem dapat menolak proses tersebut dan menampilkan pesan kesalahan.

---

# 15. MENGUNDUH LAPORAN

SIMFONI dapat menghasilkan laporan fenomena dalam dua format:

- Excel (`.xlsx`)
- PDF (`.pdf`)

## 15.1 Membuka menu laporan

1. Buka Dashboard.
2. Klik **Unduh Laporan**.

## 15.2 Mengatur filter

Pengguna dapat menentukan:

- Sektor Ekonomi.
- Status Validasi.
- Periode.

Sistem akan menghitung jumlah fenomena yang sesuai dengan filter.

## 15.3 Mengunduh Excel

1. Atur filter.
2. Periksa jumlah data yang akan diunduh.
3. Klik **Unduh Excel (.xlsx)**.
4. Baca konfirmasi.
5. Klik **Ya, unduh**.

## 15.4 Mengunduh PDF

1. Atur filter.
2. Periksa jumlah data yang akan diunduh.
3. Klik **Unduh PDF**.
4. Baca konfirmasi.
5. Klik **Ya, unduh**.

Laporan mengikuti filter yang dipilih sehingga pengguna dapat menghasilkan laporan berdasarkan kebutuhan periode, sektor, dan status.

---

# 16. ALUR KERJA PENGGUNAAN SIMFONI

Alur penggunaan SIMFONI secara umum adalah sebagai berikut:

```text
SUMBER DATA
    |
    +--> Pendataan Lapangan
    |
    +--> Portal Berita
    |
    +--> Instagram / Facebook
    |
    v
PENGUMPULAN DATA
    |
    v
PENYARINGAN & PENGOLAHAN
    |
    +--> Relevansi Raja Ampat
    +--> Kata Kunci
    +--> Sentimen
    +--> Sektor PDRB
    +--> Distrik
    |
    v
FENOMENA
    |
    v
STATUS DRAFT / TERCATAT
    |
    v
PEMERIKSAAN TIM NERACA
    |
    +--> Cek detail
    +--> Cek sektor
    +--> Cek distrik
    +--> Cek sumber
    +--> Cek kemiripan
    |
    v
VALIDASI
    |
    +--> Terverifikasi
    |       |
    |       v
    |   Digunakan dalam monitoring/laporan
    |
    +--> Tetap Draft
            |
            v
        Perlu pemeriksaan/perbaikan
```

---

# 17. STATUS DATA

SIMFONI menggunakan status utama berikut:

| Status Sistem | Tampilan Pengguna | Makna |
|---|---|---|
| Draft | Tercatat | Data sudah masuk tetapi belum dinyatakan tervalidasi |
| Terverifikasi | Terverifikasi | Data telah diperiksa dan dinyatakan valid oleh Tim Neraca |

## 17.1 Draft/Tercatat

Status awal setiap fenomena adalah Draft. Data masih dapat diperiksa dan belum dianggap sebagai data fenomena yang tervalidasi.

## 17.2 Terverifikasi

Status ini menunjukkan fenomena telah melewati pemeriksaan Tim Neraca.

---

# 18. KETENTUAN PENGISIAN DATA

Agar data SIMFONI konsisten, perhatikan hal berikut.

## 18.1 Judul

Gunakan judul yang singkat tetapi menggambarkan fenomena.

**Baik:**

> Aktivitas wisatawan Raja Ampat meningkat selama periode liburan

**Kurang baik:**

> Wisata

## 18.2 Uraian

Jelaskan apa yang terjadi, kapan terjadi, dan informasi penting yang mendukung fenomena.

## 18.3 Penyebab

Tuliskan faktor yang diketahui menjadi penyebab fenomena jika tersedia.

## 18.4 Dampak

Tuliskan dampak ekonomi yang dapat diamati atau dilaporkan.

## 18.5 Sektor PDRB

Pilih sektor yang paling sesuai dengan aktivitas ekonomi yang dibahas.

## 18.6 Distrik

Pilih distrik tempat fenomena terjadi atau lokasi yang paling relevan dengan fenomena.

## 18.7 Petugas

Gunakan nama petugas atau nama tim yang melakukan pendataan.

## 18.8 Sumber

Untuk fenomena dari sumber eksternal, pastikan sumber asli tersedia jika sistem menyediakannya.

---

# 19. PENANGANAN MASALAH UMUM

## 19.1 Data tidak muncul di daftar

Periksa:

1. Filter sektor.
2. Filter distrik.
3. Filter status.
4. Filter periode.
5. Kata pencarian.
6. Nomor halaman.

Coba pilih **Semua** pada filter dan hapus kata pencarian.

## 19.2 Tidak dapat mengubah status

Pastikan pengguna telah membuka akses Tim Neraca dengan PIN.

## 19.3 Import Excel gagal

Periksa:

- File berformat `.xlsx`.
- Template berasal dari SIMFONI.
- Nama kolom tidak diubah.
- Data wajib telah diisi.
- Tanggal berada pada rentang tahun yang diperbolehkan.

## 19.4 Sebagian baris Excel dilewati

Hal ini dapat terjadi apabila terdapat baris yang tidak memenuhi ketentuan import. Periksa hasil import yang ditampilkan sistem untuk mengetahui jumlah baris yang berhasil dan dilewati.

## 19.5 Sinkronisasi berita tidak menghasilkan data

Kemungkinan penyebab:

- Tidak ada berita baru yang relevan.
- Data sudah pernah masuk sehingga dianggap duplikat.
- Konten tidak dianggap berkaitan dengan Raja Ampat.
- Sumber berita/API sedang tidak tersedia.

## 19.6 Sinkronisasi Instagram/Facebook gagal

Fungsi ini bergantung pada konfigurasi Meta Graph API. Jika gagal, hubungi pengelola sistem untuk memeriksa konfigurasi akses dan token.

## 19.7 Laporan tidak sesuai harapan

Periksa kembali filter:

- Sektor.
- Status.
- Periode.

Jumlah data yang akan diunduh ditampilkan sebelum proses download.

---

# 20. RINGKASAN PENGGUNAAN

## Untuk Petugas/Tim Distribusi

```text
1. Buka SIMFONI
2. Pilih Tambah Fenomena
3. Isi formulir / import Excel
4. Pastikan data benar
5. Simpan / Import
6. Data masuk sebagai Draft/Tercatat
7. Tim Neraca melakukan pemeriksaan
```

## Untuk Tim Neraca

```text
1. Buka SIMFONI
2. Masuk ke halaman Fenomena
3. Buka akses Tim Neraca dengan PIN
4. Cari/filter fenomena
5. Buka detail fenomena
6. Periksa isi, sektor, distrik, sumber, dan kemiripan
7. Ubah status menjadi Terverifikasi jika sudah valid
8. Kembalikan ke Draft jika masih perlu diperiksa
9. Hapus hanya jika memang diperlukan
```

## Untuk kebutuhan laporan

```text
1. Buka Dashboard
2. Klik Unduh Laporan
3. Pilih sektor
4. Pilih status
5. Pilih periode
6. Periksa jumlah data
7. Pilih PDF atau Excel
8. Konfirmasi download
```

---

# LAMPIRAN A — STRUKTUR APLIKASI UNTUK PENGELOLA

Bagian ini ditujukan terutama untuk pengelola/administrator teknis.

```text
simfoni-app/
├── app/                  # Halaman dan API Next.js
├── components/           # Komponen antarmuka
├── lib/                  # Database, text mining, scraper, format
├── scripts/              # Seed, scraping, backfill, cleanup
├── data/                 # Database SQLite
├── .github/workflows/    # Otomasi workflow
├── .env.example          # Contoh konfigurasi environment
└── package.json          # Dependency dan perintah aplikasi
```

Fungsi utama yang tersedia di `package.json` antara lain:

```text
npm run dev
npm run build
npm run start
npm run seed
npm run scrape:news
npm run scrape:meta
npm run backfill:news
npm run cleanup:old-data
```

Pengguna umum tidak perlu menjalankan perintah tersebut. Perintah operasional dijalankan oleh pengelola sistem.

---

# LAMPIRAN B — SUMBER DATA DAN PEMROSESAN

Secara umum, data dari sumber otomatis diproses melalui tahapan:

```text
Sumber Data
    ↓
Pengambilan Data
    ↓
Penyaringan Relevansi Raja Ampat
    ↓
Text Mining
    ↓
Klasifikasi / Pemetaan Sektor PDRB
    ↓
Pemetaan Distrik
    ↓
Penyimpanan Fenomena
    ↓
Monitoring
    ↓
Validasi Tim Neraca
```

Untuk portal berita, sistem menggunakan mekanisme RSS yang dikonfigurasi pada aplikasi. Untuk Instagram/Facebook, sistem menggunakan Meta Graph API resmi apabila konfigurasi sumber tersedia.

---

# LAMPIRAN C — CATATAN PENGELOLAAN

1. Jangan membagikan PIN Tim Neraca kepada pihak yang tidak berwenang.
2. Jangan mengubah struktur template Excel tanpa menyesuaikannya dengan sistem.
3. Periksa data sebelum melakukan validasi.
4. Hindari menghapus data apabila data masih diperlukan untuk riwayat monitoring.
5. Lakukan pencadangan database secara berkala sesuai kebijakan pengelolaan sistem.
6. Jika sumber otomatis berubah, pengelola perlu memeriksa konfigurasi scraper/API.
7. Untuk perubahan teknis aplikasi, lakukan pengujian sebelum diterapkan pada lingkungan produksi.

---

# PENUTUP

SIMFONI dirancang untuk membantu BPS Kabupaten Raja Ampat membangun proses monitoring fenomena ekonomi yang lebih terstruktur, terdokumentasi, dan mudah ditelusuri.

Penggunaan sistem yang konsisten sangat bergantung pada kualitas input data, ketepatan pemilihan sektor dan distrik, serta ketelitian proses validasi oleh Tim Neraca.

Dengan mengikuti panduan ini, pengguna diharapkan dapat melakukan pendataan, monitoring, validasi, dan penyusunan laporan fenomena ekonomi secara lebih efektif melalui SIMFONI.
