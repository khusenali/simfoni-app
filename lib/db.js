// lib/db.js
// Koneksi & skema database SIMFONI menggunakan better-sqlite3.
// SQLite dipilih karena gratis, tanpa server terpisah (zero-config),
// dan cukup untuk skala data BPS Kabupaten (ribuan-puluhan ribu baris fenomena).

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "simfoni.db");
const isNew = !fs.existsSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000"); // tunggu max 5 detik kalau lagi ada tulis lain, gak langsung gagal
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS sektor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS distrik (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS indikator_bps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL UNIQUE,
  kategori TEXT
);

-- Sumber data terdaftar (portal berita / akun media sosial) yang dipantau otomatis
CREATE TABLE IF NOT EXISTS sumber (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipe TEXT NOT NULL CHECK (tipe IN ('portal_berita','media_sosial','input_manual')),
  nama TEXT NOT NULL,
  platform TEXT,               -- instagram | facebook | rss | manual
  identifier TEXT,              -- rss url, atau instagram/facebook Page/IG User ID
  aktif INTEGER DEFAULT 1,
  UNIQUE(nama, identifier)
);

CREATE TABLE IF NOT EXISTS sync_log (
  tipe TEXT PRIMARY KEY,        -- 'news' atau 'meta'
  last_sync TEXT,               -- waktu ISO terakhir sync
  inserted INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fenomena (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal TEXT NOT NULL,             -- ISO date (waktu kejadian/publikasi)
  judul TEXT NOT NULL,
  uraian TEXT,
  penyebab TEXT,
  dampak TEXT,
  sumber_tipe TEXT NOT NULL CHECK (sumber_tipe IN ('portal_berita','media_sosial','input_manual')),
  sumber_id INTEGER REFERENCES sumber(id),
  nama_sumber TEXT,                  -- nama tampilan sumber (denormalized utk pencarian cepat)
  url TEXT,
  lokasi TEXT,
  distrik_id INTEGER REFERENCES distrik(id),
  sektor_id INTEGER REFERENCES sektor(id),
  keyword TEXT,                      -- JSON array hasil text mining
  sentimen TEXT CHECK (sentimen IN ('Positif','Netral','Negatif')),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Terverifikasi')),
  penulis TEXT,
  media TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  mirip_dengan_id INTEGER REFERENCES fenomena(id) ON DELETE SET NULL,
  skor_kemiripan INTEGER
);

CREATE TABLE IF NOT EXISTS fenomena_indikator (
  fenomena_id INTEGER NOT NULL REFERENCES fenomena(id) ON DELETE CASCADE,
  indikator_id INTEGER NOT NULL REFERENCES indikator_bps(id) ON DELETE CASCADE,
  PRIMARY KEY (fenomena_id, indikator_id)
);

CREATE INDEX IF NOT EXISTS idx_fenomena_tanggal ON fenomena(tanggal);
CREATE INDEX IF NOT EXISTS idx_fenomena_status ON fenomena(status);
CREATE INDEX IF NOT EXISTS idx_fenomena_sektor ON fenomena(sektor_id);
CREATE INDEX IF NOT EXISTS idx_fenomena_sumber_tipe ON fenomena(sumber_tipe);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fenomena_url_unik ON fenomena(url) WHERE url IS NOT NULL;
`);


// ============================================================
// KBLI 2025 + klasifikasi sektor PDRB (fase 1)
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS kbli_2025 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  kode_parent TEXT,
  kategori_code TEXT,
  nama TEXT NOT NULL,
  uraian TEXT,
  aktif INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_kbli2025_parent ON kbli_2025(kode_parent);
CREATE INDEX IF NOT EXISTS idx_kbli2025_kategori ON kbli_2025(kategori_code);

CREATE TABLE IF NOT EXISTS kbli_keyword (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kbli_id INTEGER NOT NULL REFERENCES kbli_2025(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  tipe TEXT NOT NULL DEFAULT 'entity',
  bobot REAL NOT NULL DEFAULT 1,
  match_type TEXT NOT NULL DEFAULT 'phrase' CHECK (match_type IN ('word','phrase')),
  aktif INTEGER NOT NULL DEFAULT 1,
  UNIQUE(kbli_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_kbli_keyword_kbli ON kbli_keyword(kbli_id);
CREATE INDEX IF NOT EXISTS idx_kbli_keyword_aktif ON kbli_keyword(aktif);

CREATE TABLE IF NOT EXISTS kbli_sektor (
  kbli_id INTEGER NOT NULL REFERENCES kbli_2025(id) ON DELETE CASCADE,
  sektor_id INTEGER NOT NULL REFERENCES sektor(id) ON DELETE CASCADE,
  PRIMARY KEY (kbli_id, sektor_id)
);

CREATE INDEX IF NOT EXISTS idx_kbli_sektor_sektor ON kbli_sektor(sektor_id);

CREATE TABLE IF NOT EXISTS kbli_exclusion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT NOT NULL,
  tipe TEXT NOT NULL DEFAULT 'context',
  penalty REAL NOT NULL DEFAULT 1,
  kbli_id INTEGER REFERENCES kbli_2025(id) ON DELETE CASCADE,
  sektor_id INTEGER REFERENCES sektor(id) ON DELETE CASCADE,
  aktif INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fenomena_kbli (
  fenomena_id INTEGER NOT NULL REFERENCES fenomena(id) ON DELETE CASCADE,
  kbli_id INTEGER NOT NULL REFERENCES kbli_2025(id) ON DELETE CASCADE,
  skor REAL NOT NULL,
  peringkat INTEGER,
  PRIMARY KEY (fenomena_id, kbli_id)
);

CREATE INDEX IF NOT EXISTS idx_fenomena_kbli_kbli ON fenomena_kbli(kbli_id);
`);

// Migrasi aman untuk database SIMFONI yang sudah terlanjur dibuat.
function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('fenomena', 'klasifikasi_score', 'REAL');
ensureColumn('fenomena', 'klasifikasi_confidence', 'REAL');

ensureColumn(
  'fenomena',
  'classification_method',
  'TEXT CHECK (classification_method IN ("kbli_weighted_rule", "manual_validation", "unclassified"))'
);

module.exports = { db, isNew };
