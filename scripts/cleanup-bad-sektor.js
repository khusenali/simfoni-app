// scripts/cleanup-bad-sektor.js
// Jalankan sekali: node scripts/cleanup-bad-sektor.js
// Hapus baris sektor "sampah" hasil uji coba (isinya kalimat/uraian
// fenomena, bukan kategori KBLI resmi), dan kembalikan fenomena yang
// kepalang pakai sektor itu jadi "Belum ada sektor" (NULL) lagi.

const { db } = require("../lib/db");

const NAMA_SEKTOR_SAMPAH = "Harga ikan naik akibat cuaca buruk yang membuat nelayan tidak melaut.";

const row = db.prepare("SELECT id FROM sektor WHERE nama = ?").get(NAMA_SEKTOR_SAMPAH);

if (!row) {
  console.log("Sektor itu udah gak ada / sudah bersih.");
  process.exit(0);
}

const terpengaruh = db.prepare("SELECT id, judul FROM fenomena WHERE sektor_id = ?").all(row.id);
console.log(`Ditemukan sektor sampah id=${row.id}. Fenomena yang pakai sektor ini: ${terpengaruh.length}`);
terpengaruh.forEach((f) => console.log(`  - #${f.id} ${f.judul}`));

const tx = db.transaction(() => {
  db.prepare("UPDATE fenomena SET sektor_id = NULL WHERE sektor_id = ?").run(row.id);
  db.prepare("DELETE FROM sektor WHERE id = ?").run(row.id);
});
tx();

console.log("Selesai — sektor sampah dihapus, fenomena terkait dikembalikan ke 'Belum ada sektor'.");