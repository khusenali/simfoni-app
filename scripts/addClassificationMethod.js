const { db } = require("../lib/db");

console.log("========================================");
console.log("MIGRATION CLASSIFICATION METHOD");
console.log("========================================");

const columns = db
  .prepare("PRAGMA table_info(fenomena)")
  .all();

const exists = columns.some(
  (column) => column.name === "classification_method"
);

if (!exists) {
  db.exec(`
    ALTER TABLE fenomena
    ADD COLUMN classification_method TEXT
    CHECK (
      classification_method IN (
        'kbli_weighted_rule',
        'manual_validation',
        'unclassified'
      )
    );
  `);

  console.log("Kolom classification_method berhasil ditambahkan.");
} else {
  console.log("Kolom classification_method sudah tersedia.");
}

console.log("\n=== STRUKTUR FENOMENA ===");

console.table(
  db.prepare("PRAGMA table_info(fenomena)").all()
);