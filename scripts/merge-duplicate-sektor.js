// scripts/merge-duplicate-sektor.js
// Menggabungkan sektor yang KEBETULAN sudah kepecah jadi 2 baris (satu nama
// lama, satu nama baru) -- biasanya terjadi karena ada fenomena baru yang
// sempat diklasifikasi otomatis (detectSektor -> getOrCreateSektor) dengan
// nama baru SEBELUM scripts/rename-sektor.js sempat dijalankan, jadi baris
// baru keburu dibuat duluan sementara baris lama masih dipakai fenomena lain.
//
// Untuk tiap pasangan [namaLama, namaBaru]:
//   - kalau DUA-DUANYA ada di tabel sektor -> pindahkan semua fenomena dari
//     id lama ke id baru, lalu hapus baris lama (merge, tanpa kehilangan data).
//   - kalau cuma namaLama yang ada -> rename biasa (sama seperti rename-sektor.js).
//   - kalau namaLama sudah tidak ada (berarti sudah pernah dirapikan) -> lewati.
//
// Jalankan: node scripts/merge-duplicate-sektor.js            (dry-run)
//           node scripts/merge-duplicate-sektor.js --confirm   (simpan)
const { db } = require("../lib/db");

const RENAME_MAP = [
  ["Pertanian, Kehutanan, dan Perikanan", "A. Pertanian, Kehutanan, dan Perikanan"],
  ["Pertambangan dan Penggalian", "B. Pertambangan dan Penggalian"],
  ["Industri Pengolahan", "C. Industri Pengolahan"],
  ["Pengadaan Listrik dan Gas", "D. Pengadaan Listrik dan Gas"],
  ["Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang", "E. Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang"],
  ["Konstruksi", "F. Konstruksi"],
  ["Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor", "G. Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor"],
  ["Transportasi dan Pergudangan", "H. Transportasi dan Pergudangan"],
  ["Penyediaan Akomodasi dan Makan Minum", "I. Penyediaan Akomodasi dan Makan Minum"],
  ["Informasi dan Komunikasi", "J. Informasi dan Komunikasi"],
  ["Jasa Keuangan dan Asuransi", "K. Jasa Keuangan dan Asuransi"],
  ["Real Estat", "L. Real Estat"],
  ["Jasa Perusahaan", "M. Jasa Perusahaan"],
  // 2 kemungkinan nama lama untuk yang ini -- typo lama "Adminstrasi" (tanpa "i")
  // ATAU kemungkinan sudah pernah ke-ubah manual jadi ejaan benar tanpa prefix huruf.
  ["Adminstrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib", "N. Administrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib"],
  ["Administrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib", "N. Administrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib"],
  ["Jasa Pendidikan", "O. Jasa Pendidikan"],
  ["Jasa Kesehatan dan Kegiatan Sosial", "P. Jasa Kesehatan dan Kegiatan Sosial"],
  ["Jasa Lainnya", "Q. Jasa Lainnya"],
];

const confirm = process.argv.includes("--confirm");
const findByName = db.prepare("SELECT id, nama FROM sektor WHERE nama = ?");
const countFenomena = db.prepare("SELECT COUNT(*) c FROM fenomena WHERE sektor_id = ?");
const moveFenomena = db.prepare("UPDATE fenomena SET sektor_id = ? WHERE sektor_id = ?");
const deleteSektor = db.prepare("DELETE FROM sektor WHERE id = ?");
const renameSektor = db.prepare("UPDATE sektor SET nama = ? WHERE id = ?");

let merged = 0, renamed = 0, skipped = 0;

for (const [lama, baru] of RENAME_MAP) {
  const rowLama = findByName.get(lama);
  if (!rowLama) { skipped++; continue; } // nama lama sudah tidak ada, lewati

  const rowBaru = findByName.get(baru);

  if (rowBaru && rowBaru.id !== rowLama.id) {
    // Sudah kepecah jadi 2 baris -> gabungkan.
    const n = countFenomena.get(rowLama.id).c;
    console.log(`[MERGE] "${lama}" (#${rowLama.id}, ${n} fenomena) -> "${baru}" (#${rowBaru.id})`);
    merged++;
    if (confirm) {
      moveFenomena.run(rowBaru.id, rowLama.id);
      deleteSektor.run(rowLama.id);
    }
  } else if (!rowBaru) {
    // Belum ada baris baru sama sekali -> rename biasa, ID tetap sama.
    console.log(`[RENAME] #${rowLama.id} "${lama}" -> "${baru}"`);
    renamed++;
    if (confirm) renameSektor.run(baru, rowLama.id);
  }
  // else: rowBaru.id === rowLama.id -> sudah benar, tidak perlu apa-apa.
}

console.log(`\n${merged} sektor digabung, ${renamed} sektor di-rename, ${skipped} dilewati.`);
console.log(confirm ? "Selesai, perubahan disimpan." : "Dry-run selesai. Jalankan dengan --confirm untuk menyimpan.");