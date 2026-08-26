const { db } = require("../lib/db");

console.log("\n=== STRUKTUR TABEL KBLI_2025 ===");

const structure = db
  .prepare("PRAGMA table_info(kbli_2025)")
  .all();

console.table(structure);

console.log("\n=== ISI KBLI_2025 ===");

const data = db
  .prepare(`
    SELECT *
    FROM kbli_2025
    ORDER BY id
  `)
  .all();

console.table(data);

console.log("\nJumlah data:", data.length);