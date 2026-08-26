const { db } = require("../lib/db");

const oldName =
  "Adminstrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib";

const newName =
  "Administrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib";

console.log("\n=== CEK SEKTOR ===");

const rows = db.prepare(`
  SELECT id, nama
  FROM sektor
  WHERE nama = ?
     OR nama = ?
  ORDER BY id
`).all(oldName, newName);

console.table(rows);

console.log("\nJumlah record:", rows.length);

if (rows.length === 2) {
  const oldRow = rows.find(row => row.nama === oldName);
  const newRow = rows.find(row => row.nama === newName);

  console.log("\nSektor lama :", oldRow);
  console.log("Sektor benar:", newRow);

  console.log(`
Nama yang benar sudah tersedia.

JANGAN melakukan UPDATE nama.
Kita perlu memastikan foreign key:
  kbli_sektor.sektor_id
dan tabel lain
yang masih menunjuk ke sektor ID ${oldRow.id}
dialihkan ke sektor ID ${newRow.id}.

Tidak ada perubahan database yang dilakukan.
`);
} else if (rows.length === 1) {

  const onlyRow = rows[0];

  if (onlyRow.nama === oldName) {
    const result = db.prepare(`
      UPDATE sektor
      SET nama = ?
      WHERE id = ?
    `).run(newName, onlyRow.id);

    console.log("\nNama berhasil diperbaiki.");
    console.log("Jumlah baris diubah:", result.changes);
  } else {
    console.log("\nNama sektor sudah benar. Tidak ada perubahan.");
  }

} else if (rows.length === 0) {
  console.log("\nKedua nama tidak ditemukan.");
} else {
  console.log("\nKondisi database tidak sesuai dugaan.");
}