// scripts/rename-sektor-2.js
// Koreksi 5 kategori terakhir supaya sesuai skema resmi 17 Lapangan Usaha
// PDRB BPS (M,N digabung; N->O->P->Q bergeser; Q lama jadi R,S,T,U).
// Sama seperti rename-sektor.js: UPDATE in-place, ID tetap sama, fenomena
// yang sudah terhubung otomatis ikut menampilkan nama baru.
//
// Jalankan: node scripts/rename-sektor-2.js            (dry-run)
//           node scripts/rename-sektor-2.js --confirm   (simpan)
const { db } = require("../lib/db");

const RENAME_MAP = [
  ["M. Jasa Perusahaan", "M, N. Jasa Perusahaan"],
  ["N. Administrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib", "O. Administrasi Pemerintahan, Pertahanan, dan Jaminan Sosial Wajib"],
  ["O. Jasa Pendidikan", "P. Jasa Pendidikan"],
  ["P. Jasa Kesehatan dan Kegiatan Sosial", "Q. Jasa Kesehatan dan Kegiatan Sosial"],
  ["Q. Jasa Lainnya", "R, S, T, U. Jasa Lainnya"],
];

const confirm = process.argv.includes("--confirm");
const upd = db.prepare("UPDATE sektor SET nama = ? WHERE nama = ?");
const find = db.prepare("SELECT id FROM sektor WHERE nama = ?");

let renamed = 0;
let skipped = 0;

// PENTING: proses dari BELAKANG (Q dulu, baru N) -- supaya kalau ada nama
// yang kebetulan jadi target antara ("O. Jasa Pendidikan" adalah nama LAMA
// untuk satu baris, tapi juga string yang mirip target rename N->O di baris
// lain) tidak saling tabrakan urutan eksekusinya.
for (const [lama, baru] of [...RENAME_MAP].reverse()) {
  const row = find.get(lama);
  if (!row) { console.log(`(lewati) tidak ada sektor bernama "${lama}"`); skipped++; continue; }
  console.log(`[#${row.id}] "${lama}" -> "${baru}"`);
  renamed++;
  if (confirm) upd.run(baru, lama);
}

console.log(`\n${renamed} sektor akan di-rename, ${skipped} dilewati.`);
console.log(confirm ? "Selesai, perubahan disimpan." : "Dry-run selesai. Jalankan dengan --confirm untuk menyimpan.");