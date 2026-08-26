// lib/importTemplate.js
// Definisi kolom template import Excel — dipakai bareng oleh route pembuat
// template (GET) dan route pemroses import (POST) supaya urutan & label
// kolom selalu sinkron satu sama lain.

const TEMPLATE_COLUMNS = [
  { header: "Judul", key: "judul", width: 35 },
  { header: "Tanggal", key: "tanggal", width: 16 },
  { header: "Uraian", key: "uraian", width: 45 },
  { header: "Sektor", key: "sektor", width: 40 },
  { header: "Distrik", key: "distrik", width: 20 },
  { header: "Penyebab", key: "penyebab", width: 35 },
  { header: "Dampak", key: "dampak", width: 35 },
  { header: "Petugas", key: "penulis", width: 20 },
];

// Baris contoh di template selalu diawali teks ini (lihat template/route.js).
// Data asli tim tidak boleh diawali teks yang sama.
const CONTOH_PREFIX = "contoh:";

function isContohRow(record) {
  return String(record.judul || "").trim().toLowerCase().startsWith(CONTOH_PREFIX);
}

module.exports = { TEMPLATE_COLUMNS, CONTOH_PREFIX, isContohRow };