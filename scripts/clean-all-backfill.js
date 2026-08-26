// scripts/clean-all-backfill.js
const { db } = require("../lib/db");
const result = db.prepare(`DELETE FROM fenomena WHERE nama_sumber = 'Raja Ampat News'`).run();
console.log(`${result.changes} baris dihapus, siap backfill ulang.`);

if (!process.argv.includes("--confirm")) {
  console.log("Ini akan menghapus SEMUA data Raja Ampat News. Tambahkan --confirm untuk lanjut.");
  process.exit(0);
}