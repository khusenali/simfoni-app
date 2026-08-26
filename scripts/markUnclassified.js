const { db } = require("../lib/db");

console.log("========================================");
console.log("MARK UNCLASSIFIED FENOMENA");
console.log("========================================");

const result = db.prepare(`
  UPDATE fenomena
  SET
    sektor_id = NULL,
    classification_method = 'unclassified',
    updated_at = datetime('now')
  WHERE
    sektor_id IS NULL
    OR klasifikasi_confidence = 0
`).run();

console.log(
  `Fenomena diperbarui: ${result.changes}`
);

const summary = db.prepare(`
  SELECT
    classification_method,
    COUNT(*) AS jumlah
  FROM fenomena
  GROUP BY classification_method
  ORDER BY classification_method
`).all();

console.table(summary);