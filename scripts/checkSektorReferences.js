const { db } = require("../lib/db");

console.log("\n=== SEKTOR ID 14 DAN 18 ===");

const sektor = db.prepare(`
  SELECT id, nama
  FROM sektor
  WHERE id IN (14, 18)
  ORDER BY id
`).all();

console.table(sektor);


console.log("\n=== KBLI_SEKTOR ===");

const kbliSektor = db.prepare(`
  SELECT
    ks.kbli_id,
    k.kode AS kbli,
    ks.sektor_id,
    s.nama AS sektor
  FROM kbli_sektor ks
  JOIN kbli_2025 k
    ON k.id = ks.kbli_id
  JOIN sektor s
    ON s.id = ks.sektor_id
  WHERE ks.sektor_id IN (14, 18)
  ORDER BY k.kode
`).all();

console.table(kbliSektor);


console.log("\n=== FENOMENA ===");

const fenomena = db.prepare(`
  SELECT
    sektor_id,
    COUNT(*) AS jumlah
  FROM fenomena
  WHERE sektor_id IN (14, 18)
  GROUP BY sektor_id
  ORDER BY sektor_id
`).all();

console.table(fenomena);


console.log("\n=== FENOMENA KBLI ===");

const fenomenaKbli = db.prepare(`
  SELECT
    fk.fenomena_id,
    fk.kbli_id,
    k.kode AS kbli
  FROM fenomena_kbli fk
  JOIN kbli_2025 k
    ON k.id = fk.kbli_id
  WHERE fk.fenomena_id IN (
    SELECT id
    FROM fenomena
    WHERE sektor_id IN (14, 18)
  )
  ORDER BY fk.fenomena_id
`).all();

console.table(fenomenaKbli);