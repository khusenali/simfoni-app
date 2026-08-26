// scripts/rename-sumber.js
// Rename nama_sumber untuk data yang SUDAH tersimpan, supaya label lama
// ("Wahana News Papua Barat", "Input hasil pendataan") ikut berubah di UI.
// Jalankan: node scripts/rename-sumber.js            (dry-run)
//           node scripts/rename-sumber.js --confirm   (simpan)
const { db } = require("../lib/db");

const RENAME_MAP = [
  ["Wahana News Papua Barat", "Wahana News"],
  ["Input hasil pendataan", "Input Manual"],
];

const confirm = process.argv.includes("--confirm");

for (const [lama, baru] of RENAME_MAP) {
  const count = db.prepare("SELECT COUNT(*) c FROM fenomena WHERE nama_sumber = ?").get(lama).c;
  console.log(`"${lama}" -> "${baru}": ${count} baris`);
  if (confirm && count > 0) {
    db.prepare("UPDATE fenomena SET nama_sumber = ? WHERE nama_sumber = ?").run(baru, lama);
  }
}

console.log(confirm ? "Selesai, perubahan disimpan." : "Dry-run selesai. Jalankan dengan --confirm untuk menyimpan.");