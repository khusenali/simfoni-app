// scripts/checkKbliKeywordIntegrity.js
const { db } = require("../lib/db");

console.log("\n==========================================");
console.log("CEK INTEGRITAS KEYWORD KBLI");
console.log("==========================================");

// 1. Total KBLI
const totalKbli = db.prepare(`
  SELECT COUNT(*) AS jumlah
  FROM kbli_2025
  WHERE aktif = 1
`).get().jumlah;

// 2. Total keyword
const totalKeyword = db.prepare(`
  SELECT COUNT(*) AS jumlah
  FROM kbli_keyword
  WHERE aktif = 1
`).get().jumlah;

// 3. Keyword yang tidak punya KBLI
const orphanKeyword = db.prepare(`
  SELECT
    kk.id,
    kk.kbli_id,
    kk.keyword,
    kk.tipe,
    kk.bobot
  FROM kbli_keyword kk
  LEFT JOIN kbli_2025 k
    ON k.id = kk.kbli_id
  WHERE kk.aktif = 1
    AND k.id IS NULL
`).all();

// 4. KBLI level 5 yang belum memiliki keyword
const kbliTanpaKeyword = db.prepare(`
  SELECT
    k.id,
    k.kode,
    k.nama
  FROM kbli_2025 k
  LEFT JOIN kbli_keyword kk
    ON kk.kbli_id = k.id
    AND kk.aktif = 1
  WHERE k.aktif = 1
    AND k.level = 5
  GROUP BY k.id
  HAVING COUNT(kk.id) = 0
  ORDER BY k.kode
`).all();

// 5. Jumlah keyword per KBLI
const distribusi = db.prepare(`
  SELECT
    k.kode,
    k.nama,
    COUNT(kk.id) AS jumlah_keyword
  FROM kbli_2025 k
  LEFT JOIN kbli_keyword kk
    ON kk.kbli_id = k.id
    AND kk.aktif = 1
  WHERE k.aktif = 1
    AND k.level = 5
  GROUP BY k.id
  ORDER BY k.kode
`).all();

console.log(`KBLI aktif              : ${totalKbli}`);
console.log(`Keyword aktif           : ${totalKeyword}`);
console.log(`Keyword tanpa KBLI      : ${orphanKeyword.length}`);
console.log(`KBLI level 5 tanpa keyword : ${kbliTanpaKeyword.length}`);

if (orphanKeyword.length > 0) {
  console.log("\n=== ORPHAN KEYWORD ===");
  console.table(orphanKeyword);
}

if (kbliTanpaKeyword.length > 0) {
  console.log("\n=== KBLI LEVEL 5 TANPA KEYWORD ===");
  console.table(kbliTanpaKeyword);
}

console.log("\n=== DISTRIBUSI KEYWORD LEVEL 5 ===");
console.table(distribusi);

console.log("\n==========================================");
console.log("SELESAI");
console.log("==========================================");