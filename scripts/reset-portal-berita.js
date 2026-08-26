// scripts/reset-portal-berita.js
// Hapus SEMUA fenomena dari sumber_tipe 'portal_berita' (RRI, Raja Ampat
// News, Wahana News Papua Barat sekaligus) — dipakai untuk mulai scraping
// dari nol setelah perbaikan bug. Data master (sektor/distrik/sumber) dan
// fenomena non-portal-berita (input manual, media sosial) TIDAK disentuh.
//
// DEFAULT: dry-run, cuma melaporkan. Tambahkan --confirm untuk benar-benar hapus.
// Jalankan:
//   node scripts/reset-portal-berita.js
//   node scripts/reset-portal-berita.js --confirm
const { db } = require("../lib/db");

const confirm = process.argv.includes("--confirm");

const rows = db.prepare(`
  SELECT id, nama_sumber, COUNT(*) c FROM fenomena
  WHERE sumber_tipe = 'portal_berita'
  GROUP BY nama_sumber
`).all();

const total = db.prepare(`SELECT COUNT(*) c FROM fenomena WHERE sumber_tipe = 'portal_berita'`).get().c;

console.log("Rincian per sumber:");
rows.forEach((r) => console.log(`  ${r.nama_sumber}: ${r.c}`));
console.log(`Total: ${total} baris\n`);

if (!confirm) {
  console.log("Ini baru simulasi (dry-run). Tambahkan --confirm untuk benar-benar menghapus.");
  process.exit(0);
}

const ids = db.prepare(`SELECT id FROM fenomena WHERE sumber_tipe = 'portal_berita'`).all().map((r) => r.id);

// Lepas dulu referensi "mirip" dari baris LAIN (termasuk yang bukan portal
// berita) yang menunjuk ke salah satu baris yang mau dihapus ini.
const clearRefs = db.prepare(`UPDATE fenomena SET mirip_dengan_id = NULL, skor_kemiripan = NULL WHERE mirip_dengan_id = ?`);
const del = db.prepare("DELETE FROM fenomena WHERE id = ?");

const tx = db.transaction((idList) => {
  idList.forEach((id) => clearRefs.run(id));
  idList.forEach((id) => del.run(id));
});
tx(ids);

console.log(`Selesai. ${ids.length} baris dari sumber_tipe 'portal_berita' sudah dihapus.`);
console.log("Data master (sektor/distrik/sumber) dan fenomena non-portal-berita tetap utuh.");