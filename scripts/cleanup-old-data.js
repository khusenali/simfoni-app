const { db } = require("../lib/db");
const { cleanupOldFenomena, getCutoffYear } = require("../lib/cleanupOldData");

const dryRun = process.argv.includes("--dry-run");

if (dryRun) {
  const cutoffYear = getCutoffYear();
  const count = db.prepare(`
    SELECT COUNT(*) c FROM fenomena WHERE CAST(strftime('%Y', tanggal) AS INTEGER) < ?
  `).get(cutoffYear).c;
  console.log(`[dry-run] simpan >= ${cutoffYear}, akan hapus ${count} baris.`);
  process.exit(0);
}
console.log("Hasil:", cleanupOldFenomena());
process.exit(0);