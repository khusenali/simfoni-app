// scripts/add-kandidat-table.js
// Migrasi sekali-jalan: bikin tabel kandidat_berita -- antrian review hasil
// pencarian Gemini AI, terpisah dari tabel fenomena, sebelum Tim Neraca
// setuju/tolak satu-satu.
// Jalankan: node scripts/add-kandidat-table.js
require("dotenv").config({ path: ".env.local" });
const { db } = require("../lib/db");

async function main() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS kandidat_berita (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judul TEXT NOT NULL,
      ringkasan TEXT,
      url TEXT NOT NULL UNIQUE,
      tanggal TEXT,
      sumber_disebutkan TEXT,
      status TEXT NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu','Disetujui','Ditolak')),
      fenomena_id INTEGER REFERENCES fenomena(id) ON DELETE SET NULL,
      dicari_pada TEXT DEFAULT (datetime('now')),
      ditinjau_pada TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_kandidat_status ON kandidat_berita(status);

    CREATE TABLE IF NOT EXISTS gemini_usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dipanggil_pada TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log("Tabel kandidat_berita & gemini_usage_log siap.");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });