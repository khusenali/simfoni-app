// scripts/fix-distrik.js
// Jalankan: node scripts/fix-distrik.js          (dry-run)
//           node scripts/fix-distrik.js --confirm (simpan perubahan)
const { db } = require("../lib/db");
const { detectDistrik } = require("../lib/wilayah");
const { getOrCreateDistrik } = require("../lib/fenomenaRepo");

const confirm = process.argv.includes("--confirm");

const rows = db.prepare(`
  SELECT f.id, f.judul, f.uraian, f.distrik_id, d.nama AS distrik_lama
  FROM fenomena f
  LEFT JOIN distrik d ON d.id = f.distrik_id
  WHERE f.sumber_tipe = 'portal_berita'
`).all();

console.log(`Memeriksa ${rows.length} fenomena dari portal berita...`);

let berubah = 0;
const perubahan = [];
const upd = db.prepare("UPDATE fenomena SET distrik_id = ?, lokasi = ? WHERE id = ?");

for (const row of rows) {
  const distrikBaru = detectDistrik(`${row.judul} ${row.uraian}`);
  const distrikLama = row.distrik_lama || null;
  if (distrikBaru === distrikLama) continue;
  if (!distrikBaru) continue;

  berubah++;
  perubahan.push({ id: row.id, judul: row.judul.slice(0, 60), dari: distrikLama || "(kosong)", ke: distrikBaru });

  if (confirm) {
    const distrikId = getOrCreateDistrik(distrikBaru);
    upd.run(distrikId, distrikBaru, row.id);
  }
}

console.log(`\n${berubah} fenomena akan berubah klasifikasi distriknya:`);
perubahan.slice(0, 30).forEach((p) => console.log(`  [#${p.id}] "${p.judul}..." : ${p.dari} -> ${p.ke}`));
if (perubahan.length > 30) console.log(`  ... dan ${perubahan.length - 30} lainnya`);

console.log(confirm
  ? `\nSelesai. ${berubah} fenomena sudah diperbarui.`
  : `\nDry-run selesai. Jalankan dengan --confirm untuk simpan.`);