// scripts/cleanup-irrelevant.js
// Hapus data fenomena yang keburu tersimpan padahal ternyata tidak relevan
// (dipakai setelah memperbaiki bug pencocokan kata di isRajaAmpatRelated).
//
// DEFAULT: dry-run, cuma melaporkan, TIDAK menghapus apa pun.
// Tambahkan --confirm untuk benar-benar menghapus.
//
// Jalankan:
//   node scripts/cleanup-irrelevant.js "Fajar Papua"
//   node scripts/cleanup-irrelevant.js "Fajar Papua" --confirm
const { db } = require("../lib/db");
const { isRajaAmpatRelated } = require("../lib/textmining");

const namaSumber = process.argv[2];
const confirm = process.argv.includes("--confirm");

if (!namaSumber) {
  console.log('Cara pakai: node scripts/cleanup-irrelevant.js "<nama_sumber>" [--confirm]');
  process.exit(1);
}

const rows = db.prepare(`
  SELECT id, judul, uraian FROM fenomena
  WHERE nama_sumber = ? AND sumber_tipe = 'portal_berita'
`).all(namaSumber);

const toDelete = rows.filter((r) => !isRajaAmpatRelated(r.judul, r.uraian));

console.log(`Total data dari "${namaSumber}": ${rows.length}`);
console.log(`Terdeteksi TIDAK relevan (akan dihapus): ${toDelete.length}\n`);

toDelete.slice(0, 20).forEach((r) => console.log(`  - [${r.id}] ${r.judul}`));
if (toDelete.length > 20) console.log(`  ... dan ${toDelete.length - 20} lainnya`);

if (!confirm) {
  console.log("\nIni baru simulasi (dry-run). Tambahkan --confirm untuk benar-benar menghapus.");
  process.exit(0);
}

const ids = toDelete.map((r) => r.id);

// Lepas dulu referensi "mirip" dari baris LAIN yang menunjuk ke salah satu
// baris yang mau dihapus ini — supaya tidak melanggar foreign key.
const clearRefs = db.prepare(`
  UPDATE fenomena SET mirip_dengan_id = NULL, skor_kemiripan = NULL WHERE mirip_dengan_id = ?
`);
const del = db.prepare("DELETE FROM fenomena WHERE id = ?");

const tx = db.transaction((idList) => {
  idList.forEach((id) => clearRefs.run(id));
  idList.forEach((id) => del.run(id));
});
tx(ids);

console.log(`\nSelesai. ${ids.length} data tidak relevan sudah dihapus.`);