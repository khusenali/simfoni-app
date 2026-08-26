// scripts/seedKbliFull.js
//
// Seed master KBLI 2025 lengkap dari:
// data/kbli2025_full.json
//
// FUNGSI:
// 1. Mempertahankan 22 kategori KBLI A-V yang sudah ada.
// 2. Menambahkan KBLI level 2-5.
// 3. Mempertahankan ID KBLI yang sudah ada.
// 4. Mengisi kode_parent.
// 5. Mengisi kategori_code A-V.
// 6. Tidak menghapus keyword.
// 7. Tidak menghapus mapping KBLI -> sektor PDRB.
// 8. Tidak mengubah data fenomena.
//
// Struktur KBLI:
// Level 1 = Kategori
// Level 2 = Golongan Pokok
// Level 3 = Golongan
// Level 4 = Subgolongan
// Level 5 = Kelompok

const fs = require("fs");
const path = require("path");
const { db } = require("../lib/db");

// ============================================================
// 1. LOKASI MASTER KBLI
// ============================================================

const MASTER_PATH = path.join(
  process.cwd(),
  "data",
  "kbli2025_full.json"
);

console.log("==============================================");
console.log("       SEED MASTER KBLI 2025 - SIMFONI");
console.log("==============================================\n");

console.log("Master KBLI:");
console.log(MASTER_PATH);

// ============================================================
// 2. CEK FILE MASTER
// ============================================================

if (!fs.existsSync(MASTER_PATH)) {
  console.error("\nERROR:");
  console.error("File master KBLI tidak ditemukan.");
  console.error("");
  console.error("Pastikan file berada di:");
  console.error("data/kbli2025_full.json");
  console.error("");
  process.exit(1);
}

// ============================================================
// 3. BACA JSON
// ============================================================

let master;

try {
  master = JSON.parse(
    fs.readFileSync(MASTER_PATH, "utf8")
  );
} catch (error) {
  console.error("\nERROR membaca JSON:");
  console.error(error.message);
  process.exit(1);
}

// ============================================================
// 4. VALIDASI FORMAT MASTER
// ============================================================

if (!Array.isArray(master)) {
  console.error("\nERROR:");
  console.error("Format kbli2025_full.json harus berupa ARRAY.");
  process.exit(1);
}

if (master.length === 0) {
  console.error("\nERROR:");
  console.error("Master KBLI kosong.");
  process.exit(1);
}

console.log(`Jumlah record master : ${master.length}`);

// ============================================================
// 5. JUMLAH KBLI YANG DIHARAPKAN
// ============================================================
//
// Berdasarkan struktur KBLI 2025:
//
// Level 1 : 22
// Level 2 : 87
// Level 3 : 257
// Level 4 : 519
// Level 5 : 1559
//
// Total   : 2444
//

const EXPECTED = {
  1: 22,
  2: 87,
  3: 257,
  4: 519,
  5: 1559,
};

// ============================================================
// 6. HITUNG LEVEL MASTER
// ============================================================

const counts = {};

for (const row of master) {
  counts[row.level] = (counts[row.level] || 0) + 1;
}

console.log("\n=== JUMLAH MASTER PER LEVEL ===");

console.table(
  Object.entries(counts).map(([level, jumlah]) => ({
    level: Number(level),
    jumlah,
    expected: EXPECTED[level] || 0,
    status:
      jumlah === EXPECTED[level]
        ? "OK"
        : "TIDAK SESUAI",
  }))
);

// ============================================================
// 7. VALIDASI JUMLAH
// ============================================================

for (const level of Object.keys(EXPECTED)) {
  const actual = counts[level] || 0;
  const expected = EXPECTED[level];

  if (actual !== expected) {
    console.error(
      `\nERROR: jumlah KBLI level ${level} tidak sesuai.`
    );

    console.error(
      `Expected : ${expected}`
    );

    console.error(
      `Actual   : ${actual}`
    );

    process.exit(1);
  }
}

if (master.length !== 2444) {
  console.error("\nERROR:");
  console.error(
    `Total master harus 2444, tetapi ditemukan ${master.length}.`
  );

  process.exit(1);
}

console.log("\nValidasi jumlah KBLI : OK");

// ============================================================
// 8. VALIDASI FIELD
// ============================================================

console.log("\n=== VALIDASI FIELD MASTER ===");

for (const row of master) {
  if (!row.kode) {
    throw new Error(
      `KBLI tanpa kode: ${JSON.stringify(row)}`
    );
  }

  if (!row.nama) {
    throw new Error(
      `KBLI ${row.kode} tidak memiliki nama.`
    );
  }

  if (!row.level) {
    throw new Error(
      `KBLI ${row.kode} tidak memiliki level.`
    );
  }

  if (!row.kategori_code) {
    throw new Error(
      `KBLI ${row.kode} tidak memiliki kategori_code.`
    );
  }

  if (row.level === 1 && row.kode_parent !== null) {
    throw new Error(
      `Kategori ${row.kode} tidak boleh mempunyai parent.`
    );
  }
}

console.log("Field wajib          : OK");

// ============================================================
// 9. VALIDASI DUPLIKAT KODE
// ============================================================

const codeSet = new Set();
const duplicates = [];

for (const row of master) {
  if (codeSet.has(row.kode)) {
    duplicates.push(row.kode);
  }

  codeSet.add(row.kode);
}

if (duplicates.length > 0) {
  console.error("\nERROR:");
  console.error("Ditemukan kode KBLI duplikat:");

  console.table(
    [...new Set(duplicates)].map((kode) => ({
      kode,
    }))
  );

  process.exit(1);
}

console.log("Duplikasi kode       : OK");

// ============================================================
// 10. VALIDASI KODE PARENT
// ============================================================

console.log("\n=== VALIDASI PARENT ===");

for (const row of master) {
  if (row.level === 1) {
    continue;
  }

  if (!row.kode_parent) {
    throw new Error(
      `KBLI ${row.kode} tidak mempunyai kode_parent.`
    );
  }

  if (!codeSet.has(row.kode_parent)) {
    throw new Error(
      `Parent tidak ditemukan: ${row.kode} -> ${row.kode_parent}`
    );
  }
}

console.log("Parent KBLI          : OK");

// ============================================================
// 11. VALIDASI KATEGORI A-V
// ============================================================

const kategoriSet = new Set(
  master
    .filter((row) => row.level === 1)
    .map((row) => row.kode)
);

const expectedKategori = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
];

for (const kategori of expectedKategori) {
  if (!kategoriSet.has(kategori)) {
    throw new Error(
      `Kategori KBLI ${kategori} tidak ditemukan.`
    );
  }
}

for (const row of master) {
  if (!kategoriSet.has(row.kategori_code)) {
    throw new Error(
      `Kategori tidak valid untuk ${row.kode}: ${row.kategori_code}`
    );
  }
}

console.log("Kategori A-V         : OK");

// ============================================================
// 12. VALIDASI PANJANG KODE
// ============================================================
//
// Level 1:
// A, B, C, ... V
//
// Level 2:
// 01, 02, 03, ...
//
// Level 3:
// 011, 012, ...
//
// Level 4:
// 0111, 0112, ...
//
// Level 5:
// 01111, 01112, ...
//

for (const row of master) {
  if (row.level === 1) {
    if (row.kode.length !== 1) {
      throw new Error(
        `Kode level 1 tidak valid: ${row.kode}`
      );
    }

    continue;
  }

  if (row.kode.length !== row.level) {
    throw new Error(
      `Panjang kode tidak sesuai level: ` +
      `${row.kode} (level ${row.level})`
    );
  }
}

console.log("Panjang kode         : OK");

// ============================================================
// 13. PREPARE QUERY DATABASE
// ============================================================

const findByCode = db.prepare(`
  SELECT
    id,
    kode,
    level,
    nama
  FROM kbli_2025
  WHERE kode = ?
`);

const insert = db.prepare(`
  INSERT INTO kbli_2025 (
    kode,
    level,
    kode_parent,
    kategori_code,
    nama,
    uraian,
    aktif
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const update = db.prepare(`
  UPDATE kbli_2025
  SET
    level = ?,
    kode_parent = ?,
    kategori_code = ?,
    nama = ?,
    uraian = ?,
    aktif = ?
  WHERE id = ?
`);

// ============================================================
// 14. PROSES INSERT / UPDATE
// ============================================================

let inserted = 0;
let updated = 0;

const transaction = db.transaction(() => {

  for (const row of master) {

    const existing = findByCode.get(row.kode);

    if (existing) {

      update.run(
        row.level,
        row.kode_parent ?? null,
        row.kategori_code,
        row.nama,
        row.uraian ?? null,
        row.aktif ?? 1,
        existing.id
      );

      updated++;

    } else {

      insert.run(
        row.kode,
        row.level,
        row.kode_parent ?? null,
        row.kategori_code,
        row.nama,
        row.uraian ?? null,
        row.aktif ?? 1
      );

      inserted++;
    }
  }
});

// Jalankan transaksi
transaction();

// ============================================================
// 15. HASIL SEED
// ============================================================

console.log("\n==============================================");
console.log("              HASIL SEED KBLI");
console.log("==============================================");

console.log(
  `Record existing diperbarui : ${updated}`
);

console.log(
  `Record baru ditambahkan     : ${inserted}`
);

// ============================================================
// 16. CEK JUMLAH DALAM DATABASE
// ============================================================

const dbRows = db.prepare(`
  SELECT
    level,
    COUNT(*) AS jumlah
  FROM kbli_2025
  WHERE aktif = 1
  GROUP BY level
  ORDER BY level
`).all();

console.log("\n=== KBLI AKTIF DALAM DATABASE ===");

console.table(dbRows);

// ============================================================
// 17. TOTAL DATABASE
// ============================================================

const totalRow = db.prepare(`
  SELECT COUNT(*) AS jumlah
  FROM kbli_2025
  WHERE aktif = 1
`).get();

const total = totalRow.jumlah;

console.log(
  `Total KBLI aktif : ${total}`
);

if (total < 2444) {
  console.error(
    "\nPERINGATAN:"
  );

  console.error(
    `Database hanya memiliki ${total} KBLI aktif.`
  );
}

// ============================================================
// 18. CEK ORPHAN PARENT
// ============================================================

const orphan = db.prepare(`
  SELECT
    child.kode,
    child.level,
    child.kode_parent
  FROM kbli_2025 child

  LEFT JOIN kbli_2025 parent
    ON parent.kode = child.kode_parent

  WHERE child.aktif = 1
    AND child.level > 1
    AND parent.id IS NULL

  ORDER BY child.kode
`).all();

console.log("\n=== CEK ORPHAN PARENT ===");

if (orphan.length > 0) {

  console.error(
    `Ditemukan ${orphan.length} KBLI tanpa parent.`
  );

  console.table(orphan);

  process.exit(1);

} else {

  console.log(
    "Tidak ada KBLI tanpa parent : OK"
  );
}

// ============================================================
// 19. CEK KATEGORI
// ============================================================

const invalidCategory = db.prepare(`
  SELECT
    k.kode,
    k.level,
    k.kategori_code
  FROM kbli_2025 k

  WHERE k.aktif = 1

    AND NOT EXISTS (
      SELECT 1
      FROM kbli_2025 c

      WHERE c.kode = k.kategori_code
        AND c.level = 1
        AND c.aktif = 1
    )

  ORDER BY k.kode
`).all();

console.log("\n=== CEK KATEGORI ===");

if (invalidCategory.length > 0) {

  console.error(
    `Ditemukan ${invalidCategory.length} KBLI dengan kategori tidak valid.`
  );

  console.table(invalidCategory);

  process.exit(1);

} else {

  console.log(
    "Kategori A-V seluruh KBLI : OK"
  );
}

// ============================================================
// 20. CEK CONTOH HIRARKI
// ============================================================

console.log("\n=== CONTOH HIRARKI KBLI ===");

const sample = db.prepare(`
  SELECT
    kode,
    level,
    kode_parent,
    kategori_code,
    nama
  FROM kbli_2025
  WHERE aktif = 1
  ORDER BY kode
  LIMIT 20
`).all();

console.table(sample);

// ============================================================
// 21. CEK DATA LAMA
// ============================================================

const keywordCount = db.prepare(`
  SELECT COUNT(*) AS jumlah
  FROM kbli_keyword
`).get().jumlah;

const mappingCount = db.prepare(`
  SELECT COUNT(*) AS jumlah
  FROM kbli_sektor
`).get().jumlah;

const fenomenaCount = db.prepare(`
  SELECT COUNT(*) AS jumlah
  FROM fenomena
`).get().jumlah;

console.log("\n=== DATA SIMFONI YANG DIPERTAHANKAN ===");

console.log(
  `KBLI Keyword       : ${keywordCount}`
);

console.log(
  `KBLI Mapping       : ${mappingCount}`
);

console.log(
  `Fenomena           : ${fenomenaCount}`
);

// ============================================================
// 22. SELESAI
// ============================================================

console.log("\n==============================================");
console.log("        SEED KBLI 2025 BERHASIL");
console.log("==============================================");

console.log("\nDatabase yang diubah:");
console.log("- kbli_2025 : YA");

console.log("\nDatabase yang TIDAK dihapus:");
console.log("- kbli_keyword : TIDAK DIUBAH");
console.log("- kbli_sektor  : TIDAK DIUBAH");
console.log("- fenomena     : TIDAK DIUBAH");

console.log("\nLangkah berikutnya:");
console.log("Mapping seluruh KBLI → sektor PDRB.");