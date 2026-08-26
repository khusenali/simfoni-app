// scripts/checkMissingKbli.js
const { db } = require("../lib/db");

const codes = ["35121", "35122"];

console.log("\n==========================================");
console.log("CEK KBLI 35121 DAN 35122");
console.log("==========================================");

for (const kode of codes) {
  const row = db.prepare(`
    SELECT
      id,
      kode,
      level,
      kode_parent,
      kategori_code,
      nama,
      uraian,
      aktif
    FROM kbli_2025
    WHERE kode = ?
  `).get(kode);

  if (row) {
    console.log("\nDITEMUKAN:");
    console.table([row]);
  } else {
    console.log(`\n${kode} TIDAK DITEMUKAN DI DATABASE`);
  }
}

console.log("\n==========================================");