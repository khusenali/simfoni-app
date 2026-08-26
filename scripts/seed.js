// scripts/seed.js
// Mengisi data master (sektor, distrik, sumber) yang dibutuhkan aplikasi.
// Data fenomena didapat dari scraping/backfill berita asli, bukan dari sini.
// Jalankan: npm run seed
const { db } = require("../lib/db");
const { getOrCreateSektor, getOrCreateDistrik } = require("../lib/fenomenaRepo");

const SEKTOR = [
  "A. Pertanian, Kehutanan, dan Perikanan",
  "B. Pertambangan dan Penggalian",
  "C. Industri Pengolahan",
  "D. Pengadaan Listrik dan Gas",
  "E. Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang",
  "F. Konstruksi",
  "G. Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor",
  "H. Transportasi dan Pergudangan",
  "I. Penyediaan Akomodasi dan Makan Minum",
  "J. Informasi dan Komunikasi",
  "K. Jasa Keuangan dan Asuransi",
  "L. Real Estat",
  "M. Jasa Perusahaan",
  "N. Administrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib",
  "O. Jasa Pendidikan",
  "P. Jasa Kesehatan dan Kegiatan Sosial",
  "Q. Jasa Lainnya",
];

const DISTRIK = [
  "MISOOL BARAT", "MISOOL SELATAN", "MISOOL TIMUR", "MISOOL",
  "KEPULAUAN SEMBILAN", "KOFIAU", "SALAWATI TENGAH", "SALAWATI UTARA",
  "SALAWATI BARAT", "BATANTA SELATAN", "BATANTA UTARA",
  "WAIGEO BARAT KEPULAUAN", "MEOS MANSAR", "WAIGEO SELATAN", "KOTA WAISAI",
  "TELUK MAYALIBIT", "TIPLOL MAYALIBIT", "WAIGEO TIMUR", "WARWARBOMI",
  "WAIGEO UTARA", "SUPNIN", "WAIGEO BARAT", "AYAU", "KEPULAUAN AYAU",
];

const SUMBER = [
  { tipe: "portal_berita", nama: "RRI", platform: "rss", identifier: "https://rri.co.id/rss" },
  { tipe: "portal_berita", nama: "Raja Ampat News", platform: "rss", identifier: "https://rajaampatnews.com/feed/" },
  { tipe: "portal_berita", nama: "Wahana News", platform: "rss", identifier: "https://papua-barat.wahananews.co/rss" },
  { tipe: "media_sosial", nama: "Instagram @dofiorsoq", platform: "instagram", identifier: "REPLACE_WITH_IG_USER_ID" },
  { tipe: "media_sosial", nama: "Instagram @update.pbd", platform: "instagram", identifier: "REPLACE_WITH_IG_USER_ID" },
  { tipe: "media_sosial", nama: "Instagram @prokopim.rajaampat", platform: "instagram", identifier: "REPLACE_WITH_IG_USER_ID" },
];

function seedMaster() {
  SEKTOR.forEach(getOrCreateSektor);
  DISTRIK.forEach(getOrCreateDistrik);

  const insSumber = db.prepare(`
    INSERT OR IGNORE INTO sumber (tipe, nama, platform, identifier) VALUES (?, ?, ?, ?)
  `);
  SUMBER.forEach((s) => insSumber.run(s.tipe, s.nama, s.platform, s.identifier));
}

seedMaster();
console.log("Seeding data master selesai.");