// scripts/rename-sektor.js
// Ganti NAMA sektor yang sudah ada di DB secara in-place (UPDATE, bukan INSERT
// baru) supaya ID-nya tetap sama dan semua fenomena yang sudah terhubung ke
// sektor itu otomatis ikut menampilkan nama baru -- tanpa perlu migrasi ulang
// data fenomena.
//
// Sesuaikan pasangan lama->baru di bawah kalau susunan sektor kamu beda dari ini.
// Jalankan: node scripts/rename-sektor.js            (dry-run)
//           node scripts/rename-sektor.js --confirm   (simpan perubahan)
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
  ["Adminstrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib", "N. Administrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib"],
  ["Jasa Pendidikan", "O. Jasa Pendidikan"],
  ["Jasa Kesehatan dan Kegiatan Sosial", "P. Jasa Kesehatan dan Kegiatan Sosial"],
  ["Jasa Lainnya", "Q. Jasa Lainnya"],
];

const confirm = process.argv.includes("--confirm");
const upd = db.prepare("UPDATE sektor SET nama = ? WHERE nama = ?");
const find = db.prepare("SELECT id FROM sektor WHERE nama = ?");

let renamed = 0;
let skipped = 0;

for (const [lama, baru] of RENAME_MAP) {
  const row = find.get(lama);
  if (!row) { console.log(`(lewati) tidak ada sektor bernama "${lama}"`); skipped++; continue; }
  console.log(`[#${row.id}] "${lama}" -> "${baru}"`);
  renamed++;
  if (confirm) upd.run(baru, lama);
}

console.log(`\n${renamed} sektor akan di-rename, ${skipped} dilewati (tidak ditemukan / mungkin sudah baru).`);
console.log(confirm ? "Selesai, perubahan disimpan." : "Dry-run selesai. Jalankan dengan --confirm untuk menyimpan.");