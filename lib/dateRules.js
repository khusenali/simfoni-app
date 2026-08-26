// lib/dateRules.js
// Aturan bisnis rentang tanggal kejadian fenomena: hanya boleh tahun
// sebelumnya (tahun sekarang - 1) sampai tahun berjalan (tahun sekarang).
// Dipakai bareng oleh pendataan manual (api/fenomena) dan import Excel
// (api/fenomena/import) supaya aturannya gak pernah beda sendiri-sendiri.

function isTahunFenomenaValid(tanggalStr, referenceDate = new Date()) {
  if (!tanggalStr) return false;
  const tahun = new Date(tanggalStr).getUTCFullYear();
  if (Number.isNaN(tahun)) return false;
  const tahunSekarang = referenceDate.getFullYear();
  return tahun >= tahunSekarang - 1 && tahun <= tahunSekarang;
}

module.exports = { isTahunFenomenaValid };