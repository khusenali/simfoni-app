// scripts/list-priority-kbli.js
// Menampilkan kode level 4-5 di kategori-kategori yang paling relevan untuk
// berita ekonomi Raja Ampat, supaya keyword baru dipetakan ke kode yang
// benar-benar ada di database (bukan tebakan).
const { db } = require("../lib/db");

// Kategori prioritas: A (pertanian/perikanan), F (konstruksi),
// G (perdagangan), I (akomodasi/makan-minum)
const PRIORITY_CATEGORIES = ["A", "F", "G", "I"];

for (const kat of PRIORITY_CATEGORIES) {
  const rows = db.prepare(`
    SELECT kode, level, nama
    FROM kbli_2025
    WHERE kategori_code = ? AND level IN (4, 5) AND aktif = 1
    ORDER BY kode
  `).all(kat);

  console.log(`\n=== KATEGORI ${kat} (${rows.length} kode level 4-5) ===`);
  console.table(rows.map((r) => ({ kode: r.kode, level: r.level, nama: r.nama.slice(0, 70) })));
}