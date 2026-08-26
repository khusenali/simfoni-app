// scripts/seedKbliPhase1.js
// Seed awal vocabulary KBLI 2025 untuk SIMFONI.
// Ini BUKAN pengganti master resmi 1.559 kelompok KBLI 2025.
// Fungsinya untuk membuat engine scoring dapat langsung diuji.

const { db } = require('../lib/db');

const SECTORS = [
  'A. Pertanian, Kehutanan, dan Perikanan',
  'B. Pertambangan dan Penggalian',
  'C. Industri Pengolahan',
  'D. Pengadaan Listrik dan Gas',
  'E. Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang',
  'F. Konstruksi',
  'G. Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor',
  'H. Transportasi dan Pergudangan',
  'I. Penyediaan Akomodasi dan Makan Minum',
  'J. Informasi dan Komunikasi',
  'K. Jasa Keuangan dan Asuransi',
  'L. Real Estat',
  'M. Jasa Perusahaan',
  'N. Administrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib',
  'O. Jasa Pendidikan',
  'P. Jasa Kesehatan dan Kegiatan Sosial',
  'Q. Jasa Lainnya',
];

// Kategori KBLI 2025 resmi BPS yang digunakan sebagai layer awal.
const CATEGORIES = [
  ['A', 'Pertanian, Kehutanan, dan Perikanan'],
  ['B', 'Pertambangan dan Penggalian'],
  ['C', 'Industri'],
  ['D', 'Penyediaan Listrik, Gas, Uap/Air Panas, dan Udara Dingin'],
  ['E', 'Penyediaan Air; Pengelolaan Air Limbah, Penanganan Limbah, dan Remediasi'],
  ['F', 'Konstruksi'],
  ['G', 'Perdagangan Besar dan Eceran'],
  ['H', 'Transportasi dan Penyimpanan'],
  ['I', 'Aktivitas Penyediaan Akomodasi dan Makan Minum'],
  ['J', 'Aktivitas Penerbitan, Penyiaran, serta Produksi dan Distribusi Konten'],
  ['K', 'Aktivitas Telekomunikasi, Pemrograman Komputer, Konsultansi, Infrastruktur Komputasi, dan Jasa Informasi Lainnya'],
  ['L', 'Aktivitas Keuangan dan Asuransi'],
  ['M', 'Aktivitas Real Estat'],
  ['N', 'Aktivitas Profesional, Ilmiah, dan Teknis'],
  ['O', 'Aktivitas Administratif dan Penunjang Usaha'],
  ['P', 'Administrasi Pemerintahan dan Pertahanan, Serta Jaminan Sosial Wajib'],
  ['Q', 'Pendidikan'],
  ['R', 'Aktivitas Kesehatan Manusia dan Aktivitas Sosial'],
  ['S', 'Kesenian, Olahraga, dan Rekreasi'],
  ['T', 'Aktivitas Jasa Lainnya'],
  ['U', 'Aktivitas Rumah Tangga sebagai Pemberi Kerja dan Aktivitas Produksi Rumah Tangga'],
  ['V', 'Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya'],
];

const SECTOR_TO_CATEGORIES = {
  'A. Pertanian, Kehutanan, dan Perikanan': ['A'],
  'B. Pertambangan dan Penggalian': ['B'],
  'C. Industri Pengolahan': ['C'],
  'D. Pengadaan Listrik dan Gas': ['D'],
  'E. Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang': ['E'],
  'F. Konstruksi': ['F'],
  'G. Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor': ['G'],
  'H. Transportasi dan Pergudangan': ['H'],
  'I. Penyediaan Akomodasi dan Makan Minum': ['I'],
  'J. Informasi dan Komunikasi': ['J', 'K'],
  'K. Jasa Keuangan dan Asuransi': ['L'],
  'L. Real Estat': ['M'],
  'M. Jasa Perusahaan': ['N', 'O'],
  'N. Administrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib': ['P'],
  'O. Jasa Pendidikan': ['Q'],
  'P. Jasa Kesehatan dan Kegiatan Sosial': ['R'],
  'Q. Jasa Lainnya': ['S', 'T', 'U', 'V'],
};

// Vocabulary awal. Nanti diganti/diperluas dengan vocabulary dari uraian
// kelompok/subgolongan KBLI 2025 resmi + istilah lokal Raja Ampat.
const KEYWORDS = {
  A: [
    ['pertanian', 'sektor', 2], ['petani', 'entity', 3], ['sawah', 'entity', 3],
    ['padi', 'entity', 3], ['jagung', 'entity', 3], ['kebun', 'entity', 2],
    ['perkebunan', 'activity', 3], ['panen', 'activity', 2], ['hortikultura', 'sector', 4],
    ['kelapa', 'commodity', 3], ['pala', 'commodity', 4], ['sagu', 'commodity', 4],
    ['kakao', 'commodity', 3], ['kopra', 'commodity', 4], ['cengkeh', 'commodity', 3],
    ['hutan', 'entity', 3], ['kehutanan', 'sector', 4], ['kayu', 'commodity', 3],
    ['hasil hutan', 'activity', 4], ['nelayan', 'entity', 4], ['ikan', 'commodity', 2],
    ['penangkapan ikan', 'activity', 5], ['tangkapan ikan', 'activity', 5],
    ['perikanan', 'sector', 4], ['budidaya ikan', 'activity', 5], ['tambak', 'entity', 3],
    ['keramba', 'entity', 3], ['tuna', 'commodity', 4], ['cakalang', 'commodity', 4],
    ['tongkol', 'commodity', 3], ['kerapu', 'commodity', 3], ['lobster', 'commodity', 3],
    ['kepiting', 'commodity', 3], ['rajungan', 'commodity', 3], ['cumi', 'commodity', 3],
    ['rumput laut', 'commodity', 4],
  ],
  B: [
    ['tambang', 'sector', 4], ['pertambangan', 'sector', 5], ['penambangan', 'activity', 4],
    ['galian', 'activity', 4], ['mineral', 'commodity', 3], ['bijih', 'commodity', 4],
    ['emas', 'commodity', 4], ['nikel', 'commodity', 4], ['tembaga', 'commodity', 4],
    ['pasir', 'commodity', 3], ['kerikil', 'commodity', 3], ['batu kapur', 'commodity', 4],
    ['tanah liat', 'commodity', 4], ['eksplorasi tambang', 'activity', 5], ['IUP', 'entity', 4],
  ],
  C: [
    ['industri', 'sector', 4], ['pabrik', 'entity', 3], ['manufaktur', 'sector', 5],
    ['pengolahan', 'activity', 2], ['industri pengolahan', 'sector', 5],
    ['pengolahan ikan', 'activity', 5], ['pengalengan ikan', 'activity', 5],
    ['ikan olahan', 'product', 4], ['kopra', 'commodity', 2], ['minyak kelapa', 'product', 4],
    ['sagu olahan', 'product', 4], ['tepung sagu', 'product', 4], ['mebel', 'product', 4],
    ['furniture', 'product', 4], ['konveksi', 'activity', 4], ['garmen', 'activity', 4],
  ],
  D: [
    ['listrik', 'sector', 4], ['PLN', 'entity', 4], ['pembangkit listrik', 'activity', 5],
    ['PLTS', 'entity', 5], ['PLTD', 'entity', 5], ['PLTA', 'entity', 5],
    ['jaringan listrik', 'activity', 4], ['gardu listrik', 'entity', 4], ['gas', 'commodity', 2],
    ['LPG', 'commodity', 4], ['energi listrik', 'sector', 4],
  ],
  E: [
    ['air bersih', 'service', 4], ['PDAM', 'entity', 5], ['pengolahan air', 'activity', 4],
    ['air limbah', 'service', 4], ['limbah', 'sector', 3], ['sampah', 'sector', 3],
    ['pengelolaan sampah', 'activity', 5], ['daur ulang', 'activity', 5], ['TPA', 'entity', 4],
    ['bank sampah', 'entity', 4], ['IPAL', 'entity', 5], ['sanitasi', 'service', 3],
  ],
  F: [
    ['konstruksi', 'sector', 5], ['kontraktor', 'entity', 4], ['pembangunan jalan', 'activity', 5],
    ['pembangunan jembatan', 'activity', 5], ['pembangunan gedung', 'activity', 5],
    ['renovasi', 'activity', 4], ['rehabilitasi', 'activity', 3], ['proyek konstruksi', 'activity', 5],
    ['bendungan', 'entity', 4], ['drainase', 'entity', 3], ['irigasi', 'entity', 3],
  ],
  G: [
    ['perdagangan', 'sector', 5], ['pedagang', 'entity', 4], ['pasar', 'entity', 3],
    ['toko', 'entity', 3], ['kios', 'entity', 3], ['grosir', 'activity', 4], ['eceran', 'activity', 4],
    ['distributor', 'entity', 4], ['pengecer', 'entity', 4], ['jual beli', 'activity', 4],
    ['penjualan', 'activity', 2], ['harga pasar', 'phenomenon', 3], ['dealer', 'entity', 4],
    ['bengkel', 'entity', 3], ['suku cadang', 'product', 4], ['reparasi mobil', 'activity', 5],
    ['reparasi motor', 'activity', 5], ['UMKM', 'entity', 2],
  ],
  H: [
    ['transportasi', 'sector', 5], ['angkutan', 'activity', 4], ['pelabuhan', 'entity', 4],
    ['bandara', 'entity', 4], ['penerbangan', 'activity', 4], ['kapal', 'entity', 3],
    ['pelayaran', 'activity', 4], ['speedboat', 'entity', 4], ['logistik', 'activity', 5],
    ['ekspedisi', 'activity', 4], ['gudang', 'entity', 4], ['pergudangan', 'sector', 5],
    ['bongkar muat', 'activity', 5], ['angkutan barang', 'activity', 5], ['kurir', 'activity', 4],
  ],
  I: [
    ['hotel', 'entity', 5], ['resort', 'entity', 5], ['homestay', 'entity', 5], ['penginapan', 'entity', 4],
    ['akomodasi', 'sector', 5], ['restoran', 'entity', 5], ['rumah makan', 'entity', 5],
    ['kafe', 'entity', 4], ['cafe', 'entity', 4], ['kuliner', 'sector', 4], ['katering', 'activity', 4],
  ],
  J: [
    ['penerbitan', 'activity', 4], ['penyiaran', 'activity', 5], ['radio', 'entity', 4],
    ['televisi', 'entity', 4], ['podcast', 'entity', 5], ['streaming', 'activity', 5],
    ['konten digital', 'activity', 5], ['produksi konten', 'activity', 5], ['media online', 'entity', 4],
  ],
  K: [
    ['telekomunikasi', 'sector', 5], ['internet', 'service', 4], ['BTS', 'entity', 5],
    ['menara telekomunikasi', 'entity', 5], ['fiber optik', 'entity', 5], ['5G', 'technology', 5],
    ['4G', 'technology', 4], ['data center', 'entity', 5], ['pusat data', 'entity', 5],
    ['cloud', 'technology', 4], ['pemrograman', 'activity', 5], ['programmer', 'entity', 4],
    ['aplikasi', 'product', 3], ['perangkat lunak', 'product', 5], ['kecerdasan buatan', 'technology', 5],
    ['artificial intelligence', 'technology', 5], ['machine learning', 'technology', 5],
  ],
  L: [
    ['bank', 'entity', 4], ['perbankan', 'sector', 5], ['kredit', 'service', 4], ['pinjaman', 'service', 4],
    ['asuransi', 'sector', 5], ['polis', 'product', 4], ['premi', 'product', 4], ['pegadaian', 'entity', 4],
    ['fintech', 'sector', 5], ['pasar modal', 'sector', 5], ['saham', 'product', 3],
  ],
  M: [
    ['real estat', 'sector', 5], ['properti', 'sector', 4], ['developer', 'entity', 4],
    ['pengembang perumahan', 'entity', 4], ['sewa tanah', 'activity', 4], ['jual tanah', 'activity', 4],
    ['harga tanah', 'phenomenon', 4], ['apartemen', 'entity', 4],
  ],
  N: [
    ['konsultan', 'service', 4], ['konsultansi', 'service', 4], ['arsitek', 'profession', 5],
    ['arsitektur', 'service', 4], ['insinyur', 'profession', 4], ['akuntan', 'profession', 5],
    ['audit', 'service', 4], ['periklanan', 'activity', 4], ['penelitian', 'activity', 3],
    ['riset', 'activity', 3], ['notaris', 'profession', 5], ['jasa hukum', 'service', 5],
  ],
  O: [
    ['outsourcing', 'service', 5], ['rekrutmen', 'activity', 4], ['penyaluran tenaga kerja', 'activity', 5],
    ['cleaning service', 'service', 5], ['keamanan', 'service', 3], ['jasa administrasi', 'service', 4],
    ['biro perjalanan', 'service', 5], ['travel agent', 'service', 5], ['event organizer', 'service', 4],
    ['jasa penyewaan', 'service', 4],
  ],
  P: [
    ['pemerintah', 'entity', 2], ['pemerintahan', 'sector', 3], ['pemkab', 'entity', 3],
    ['dinas', 'entity', 2], ['bupati', 'entity', 2], ['APBD', 'entity', 4], ['APBN', 'entity', 4],
    ['TNI', 'entity', 4], ['pertahanan', 'sector', 5], ['jaminan sosial', 'service', 4],
  ],
  Q: [
    ['pendidikan', 'sector', 5], ['sekolah', 'entity', 4], ['guru', 'profession', 4], ['siswa', 'entity', 3],
    ['kampus', 'entity', 4], ['universitas', 'entity', 4], ['mahasiswa', 'entity', 3],
    ['beasiswa', 'service', 3], ['pelatihan', 'activity', 2],
  ],
  R: [
    ['kesehatan', 'sector', 5], ['rumah sakit', 'entity', 5], ['puskesmas', 'entity', 5],
    ['klinik', 'entity', 4], ['dokter', 'profession', 4], ['bidan', 'profession', 4],
    ['perawat', 'profession', 4], ['apotek', 'entity', 4], ['obat', 'product', 3],
    ['BPJS kesehatan', 'entity', 5], ['kegiatan sosial', 'sector', 4],
  ],
  S: [
    ['kesenian', 'sector', 5], ['olahraga', 'sector', 5], ['hiburan', 'sector', 4], ['rekreasi', 'sector', 4],
    ['museum', 'entity', 4], ['taman hiburan', 'entity', 5], ['pertunjukan', 'activity', 4],
  ],
  T: [
    ['salon', 'service', 5], ['barbershop', 'service', 5], ['laundry', 'service', 5],
    ['jasa pribadi', 'service', 5], ['jasa lainnya', 'sector', 3],
  ],
};

function getSectorId(name) {
  const row = db.prepare('SELECT id FROM sektor WHERE nama = ?').get(name);
  if (row) return row.id;
  return db.prepare('INSERT INTO sektor (nama) VALUES (?)').run(name).lastInsertRowid;
}

const tx = db.transaction(() => {
  const sectorIds = new Map(SECTORS.map((name) => [name, getSectorId(name)]));
  const insertKbli = db.prepare(`
    INSERT INTO kbli_2025 (kode, level, kode_parent, kategori_code, nama, uraian)
    VALUES (?, 1, NULL, ?, ?, ?)
    ON CONFLICT(kode) DO UPDATE SET nama = excluded.nama, uraian = excluded.uraian, aktif = 1
  `);
  const getKbli = db.prepare('SELECT id FROM kbli_2025 WHERE kode = ?');
  const insertMap = db.prepare('INSERT OR IGNORE INTO kbli_sektor (kbli_id, sektor_id) VALUES (?, ?)');
  const insertKw = db.prepare(`
    INSERT INTO kbli_keyword (kbli_id, keyword, tipe, bobot, match_type)
    VALUES (?, ?, ?, ?, 'phrase')
    ON CONFLICT(kbli_id, keyword) DO UPDATE SET tipe = excluded.tipe, bobot = excluded.bobot, aktif = 1
  `);

  for (const [kode, nama] of CATEGORIES) {
    insertKbli.run(kode, kode, nama, nama);
  }

  for (const [sectorName, cats] of Object.entries(SECTOR_TO_CATEGORIES)) {
    const sectorId = sectorIds.get(sectorName);
    for (const kode of cats) {
      const kbliId = getKbli.get(kode).id;
      insertMap.run(kbliId, sectorId);
    }
  }

  for (const [kode, words] of Object.entries(KEYWORDS)) {
    const kbliId = getKbli.get(kode).id;
    for (const [keyword, tipe, bobot] of words) {
      insertKw.run(kbliId, keyword, tipe, bobot);
    }
  }
});

tx();
console.log('Seed KBLI Phase 1 selesai.');
console.log('Catatan: data kategori + vocabulary awal sudah masuk; master 5-digit resmi 2025 belum diimpor.');
