// scripts/migrate-kandidat-to-turso.js
// Pindahin isi tabel kandidat_berita dari file SQLite lokal (simfoni.db --
// bekas salah konfigurasi TURSO_DATABASE_URL) ke Turso production.
// Dedup pakai kolom url (UNIQUE) -- yang udah ada di Turso dilewati, bukan
// error/nimpa.
//
// Jalankan: node scripts/migrate-kandidat-to-turso.js
// (TURSO_DATABASE_URL & TURSO_AUTH_TOKEN diambil dari .env.local -- pastikan
// sudah nunjuk ke Turso yang BENAR sebelum jalanin ini)
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");

// GANTI path ini kalau lokasi file SQLite lokal kamu beda -- isi dulu nama
// file/folder yang sesuai sama yang kebaca pas .env.local masih salah
// (sering ada di root project sebagai "simfoni.db", atau di folder
// "data/simfoni.db"). Dicek otomatis di bawah, exit kalau gak ketemu.
const CANDIDATE_PATHS = [
  path.join(process.cwd(), "data", "simfoni.db"),
  path.join(process.cwd(), "simfoni.db"),
];

function findLocalDbPath() {
  for (const p of CANDIDATE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN belum ke-set di .env.local. Berhenti.");
    process.exit(1);
  }
  if (process.env.TURSO_DATABASE_URL.startsWith("file:")) {
    console.error("TURSO_DATABASE_URL masih nunjuk ke file lokal. Benerin .env.local dulu sebelum migrasi.");
    process.exit(1);
  }

  const localDbPath = findLocalDbPath();
  if (!localDbPath) {
    console.error(`simfoni.db gak ketemu di: ${CANDIDATE_PATHS.join(" atau ")}`);
    console.error('Cari manual: dir /s /b simfoni.db   (jalanin di root project lewat PowerShell/CMD)');
    process.exit(1);
  }
  console.log(`Pakai file lokal: ${localDbPath}`);

  // Windows: "file:" + path relatif/backslash suka salah di-parse libsql --
  // dikonversi ke forward slash semua, path absolute.
  const localUrl = `file:${localDbPath.replace(/\\/g, "/")}`;
  const local = createClient({ url: localUrl });
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const rs = await local.execute("SELECT * FROM kandidat_berita");
  const rows = rs.rows;
  console.log(`Ditemukan ${rows.length} baris di simfoni.db lokal.`);

  let migrated = 0, skipped = 0, errors = 0;

  for (const row of rows) {
    // id dibiarkan auto-increment baru di Turso -- JANGAN dipaksa sama persis,
    // biar gak bentrok sama id yang udah dipakai data lain di Turso.
    const { id, ...rest } = row;
    const columns = Object.keys(rest);
    const placeholders = columns.map((c) => `:${c}`).join(", ");
    const columnList = columns.join(", ");

    try {
      await turso.execute({
        sql: `INSERT INTO kandidat_berita (${columnList}) VALUES (${placeholders})
              ON CONFLICT(url) DO NOTHING`,
        args: rest,
      });
      migrated++;
    } catch (err) {
      errors++;
      console.warn(`Gagal migrasi "${row.judul || row.url}": ${err.message}`);
    }
  }

  console.log(`\nSelesai. Dicoba: ${rows.length}, berhasil (termasuk yang di-skip karena url duplikat): ${migrated}, error: ${errors}.`);
  console.log("Catatan: ON CONFLICT DO NOTHING -- url yang sudah ada di Turso otomatis dilewati tanpa error.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});