const { db } = require("../lib/db");

function count(table) {
  const row = db
    .prepare(`SELECT COUNT(*) AS total FROM ${table}`)
    .get();

  return row.total;
}

console.log("\n=== STATUS DATABASE KBLI ===");

console.log(
  "KBLI 2025       :",
  count("kbli_2025")
);

console.log(
  "KBLI Keyword    :",
  count("kbli_keyword")
);

console.log(
  "KBLI Mapping    :",
  count("kbli_sektor")
);

console.log(
  "KBLI Exclusion  :",
  count("kbli_exclusion")
);

console.log(
  "Fenomena KBLI   :",
  count("fenomena_kbli")
);

console.log("\n=== SAMPLE KBLI ===");

const kbli = db.prepare(`
  SELECT
    k.id,
    k.kode,
    k.level,
    k.nama,
    COUNT(kk.id) AS jumlah_keyword
  FROM kbli_2025 k
  LEFT JOIN kbli_keyword kk
    ON kk.kbli_id = k.id
  GROUP BY k.id
  ORDER BY k.kode
  LIMIT 20
`).all();

console.table(kbli);

console.log("\n=== SAMPLE KEYWORD ===");

const keywords = db.prepare(`
  SELECT
    kk.keyword,
    kk.tipe,
    kk.bobot,
    kk.match_type,
    k.kode,
    k.nama
  FROM kbli_keyword kk
  JOIN kbli_2025 k
    ON k.id = kk.kbli_id
  ORDER BY kk.bobot DESC
  LIMIT 30
`).all();

console.table(keywords);