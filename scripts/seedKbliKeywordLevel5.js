// scripts/seedKbliKeywordLevel5.js
//
// Seed keyword KBLI 2025 LEVEL 5.
// - Seluruh KBLI level 5 mendapatkan keyword dari nama resmi KBLI.
// - KBLI prioritas Raja Ampat mendapatkan keyword tambahan yang lebih spesifik.
// - Aman dijalankan berulang (UPSERT).
//
// Bobot:
// 5 = sangat spesifik terhadap aktivitas ekonomi
// 4 = spesifik / nama resmi KBLI
// 3 = keyword konteks yang masih relevan
//
// Tipe:
// activity = aktivitas ekonomi
// entity   = entitas/istilah khusus

const fs = require("fs");
const path = require("path");
const { db } = require("../lib/db");

// ============================================================
// 1. CARI FILE KBLI 2025
// ============================================================

const JSON_CANDIDATES = [
  path.join(__dirname, "../data/kbli2025_full.json"),
  path.join(__dirname, "../data/kbli2025_full(2).json"),
  path.join(__dirname, "../kbli2025_full.json"),
  path.join(__dirname, "../kbli2025_full(2).json"),
];

const jsonPath = JSON_CANDIDATES.find((p) => fs.existsSync(p));

if (!jsonPath) {
  console.error("File kbli2025_full.json tidak ditemukan.");
  console.error("Pastikan file berada di folder data/ atau root project.");
  process.exit(1);
}

console.log("Menggunakan file:");
console.log(jsonPath);

const KBLI = JSON.parse(
  fs.readFileSync(jsonPath, "utf8")
);

// ============================================================
// 2. KEYWORD TAMBAHAN KHUSUS KONTEKS RAJA AMPAT
// ============================================================
//
// Format:
// kode: [
//   [keyword, tipe, bobot],
//   ...
// ]
//
// Jangan memasukkan keyword terlalu umum karena dapat
// menyebabkan salah klasifikasi antar sektor.
//

const CURATED_LEVEL5 = {

  // ==========================================================
  // A. PERTANIAN, KEHUTANAN, PERIKANAN
  // ==========================================================

  "03110": [
    ["penangkapan ikan", "activity", 5],
    ["penangkapan ikan laut", "activity", 5],
    ["nelayan tangkap", "activity", 5],
    ["ikan hasil tangkapan", "entity", 4],
    ["hasil tangkapan laut", "entity", 4],
    ["tangkapan ikan", "entity", 5],
    ["perikanan tangkap", "activity", 5],
  ],

  "03120": [
    ["penangkapan ikan air tawar", "activity", 5],
    ["penangkapan ikan perairan tawar", "activity", 5],
    ["perikanan air tawar", "activity", 4],
  ],

  "03211": [
    ["budidaya ikan laut", "activity", 5],
    ["budidaya ikan bersirip", "activity", 5],
    ["budidaya ikan laut", "activity", 5],
    ["ikan budidaya laut", "entity", 4],
    ["perikanan budidaya laut", "activity", 5],
  ],

  "03212": [
    ["budidaya ikan hias laut", "activity", 5],
    ["ikan hias laut", "entity", 5],
    ["budidaya ikan hias", "activity", 4],
  ],

  "03213": [
    ["budidaya tumbuhan laut", "activity", 5],
    ["budidaya rumput laut", "activity", 5],
    ["rumput laut", "entity", 4],
    ["budidaya rumput laut laut", "activity", 4],
  ],

  "03221": [
    ["budidaya ikan air tawar", "activity", 5],
    ["budidaya ikan tawar", "activity", 5],
    ["perikanan budidaya air tawar", "activity", 5],
  ],

  "03222": [
    ["budidaya ikan hias air tawar", "activity", 5],
    ["ikan hias air tawar", "entity", 5],
  ],

  "03223": [
    ["budidaya tumbuhan air tawar", "activity", 5],
  ],

  "03231": [
    ["budidaya ikan air payau", "activity", 5],
    ["budidaya ikan payau", "activity", 5],
    ["perikanan budidaya air payau", "activity", 5],
  ],

  "03232": [
    ["budidaya ikan hias air payau", "activity", 5],
    ["ikan hias air payau", "entity", 5],
  ],

  "03233": [
    ["budidaya tumbuhan air payau", "activity", 5],
  ],

  "03300": [
    ["jasa penunjang perikanan", "activity", 5],
    ["jasa penunjang penangkapan ikan", "activity", 5],
    ["jasa penunjang budidaya ikan", "activity", 5],
    ["usaha penunjang perikanan", "activity", 4],
  ],

  "10798": [
    ["bahan makanan dari rumput laut", "activity", 5],
    ["pengolahan rumput laut", "activity", 5],
    ["produk rumput laut", "entity", 4],
  ],

  "46324": [
    ["perdagangan hasil perikanan", "activity", 5],
    ["perdagangan besar hasil perikanan", "activity", 5],
    ["perdagangan ikan", "activity", 4],
    ["perdagangan hasil laut", "activity", 4],
  ],

  "47753": [
    ["perdagangan ikan hidup", "activity", 5],
    ["penjualan ikan hidup", "activity", 5],
    ["ikan hidup", "entity", 4],
  ],

  // ==========================================================
  // B. AKOMODASI DAN MAKAN MINUM
  // ==========================================================

  "55101": [
    ["hotel bintang lima", "activity", 5],
    ["hotel", "entity", 4],
  ],

  "55102": [
    ["hotel bintang empat", "activity", 5],
    ["hotel", "entity", 4],
  ],

  "55103": [
    ["hotel bintang tiga", "activity", 5],
    ["hotel", "entity", 4],
  ],

  "55104": [
    ["hotel bintang dua", "activity", 5],
    ["hotel", "entity", 4],
  ],

  "55105": [
    ["hotel bintang satu", "activity", 5],
    ["hotel", "entity", 4],
  ],

  "55106": [
    ["hotel nonbintang", "activity", 5],
    ["hotel melati", "activity", 5],
    ["hotel", "entity", 4],
  ],

  "55201": [
    ["homestay", "activity", 5],
    ["rumah tinggal sewa", "activity", 5],
    ["penginapan warga", "activity", 4],
  ],

  "55202": [
    ["hostel", "activity", 5],
    ["youth hostel", "activity", 5],
  ],

  "55203": [
    ["vila", "activity", 5],
    ["villa", "activity", 5],
  ],

  "55204": [
    ["apartemen hotel", "activity", 5],
    ["aparthotel", "activity", 5],
  ],

  "56101": [
    ["rumah makan", "activity", 5],
    ["restoran", "activity", 5],
    ["warung makan", "activity", 5],
    ["tempat makan", "entity", 4],
    ["usaha kuliner", "activity", 4],
  ],

  "56102": [
    ["warung makan", "activity", 5],
    ["kedai makanan", "activity", 5],
    ["usaha makanan", "activity", 4],
  ],

  "56210": [
    ["jasa boga", "activity", 5],
    ["catering", "activity", 5],
    ["katering", "activity", 5],
    ["event catering", "activity", 5],
  ],

  // ==========================================================
  // C. TRANSPORTASI DAN PERGUDANGAN
  // ==========================================================

  "49292": [
    ["angkutan pariwisata", "activity", 5],
    ["transportasi wisata", "activity", 5],
    ["bus wisata", "entity", 4],
    ["kendaraan wisata", "entity", 4],
  ],

  "50111": [
    ["angkutan laut penumpang", "activity", 5],
    ["transportasi laut penumpang", "activity", 5],
    ["kapal penumpang", "entity", 4],
  ],

  "50112": [
    ["angkutan laut perintis", "activity", 5],
    ["pelayaran perintis", "activity", 5],
    ["kapal perintis", "entity", 4],
  ],

  "50113": [
    ["angkutan laut untuk wisata", "activity", 5],
    ["transportasi laut wisata", "activity", 5],
    ["kapal wisata", "entity", 5],
    ["perahu wisata", "entity", 5],
  ],

  "50121": [
    ["angkutan laut barang", "activity", 5],
    ["transportasi laut barang", "activity", 5],
    ["kapal barang", "entity", 4],
  ],

  "50213": [
    ["angkutan sungai dan danau untuk wisata", "activity", 5],
    ["transportasi sungai wisata", "activity", 5],
    ["wisata sungai", "activity", 4],
  ],

  "52221": [
    ["pelayanan kepelabuhanan laut", "activity", 5],
    ["pelayanan pelabuhan", "activity", 5],
    ["pelabuhan laut", "entity", 4],
  ],

  "52224": [
    ["pelabuhan perikanan", "activity", 5],
    ["aktivitas pelabuhan perikanan", "activity", 5],
    ["pelabuhan ikan", "entity", 5],
  ],

  "52109": [
    ["pergudangan", "activity", 5],
    ["gudang", "entity", 4],
    ["penyimpanan barang", "activity", 4],
    ["jasa gudang", "activity", 4],
  ],

  // ==========================================================
  // D. PARIWISATA
  // ==========================================================

  "68121": [
    ["pengelolaan kawasan pariwisata", "activity", 5],
    ["kawasan pariwisata", "entity", 5],
    ["pengelola kawasan wisata", "activity", 5],
  ],

  "79121": [
    ["biro perjalanan wisata", "activity", 5],
    ["agen perjalanan wisata", "activity", 5],
    ["travel wisata", "activity", 5],
    ["travel agent", "activity", 5],
  ],

  "79901": [
    ["jasa informasi pariwisata", "activity", 5],
    ["informasi pariwisata", "entity", 4],
  ],

  "79902": [
    ["informasi daya tarik wisata", "activity", 5],
    ["daya tarik wisata", "entity", 5],
    ["informasi objek wisata", "entity", 4],
  ],

  "79903": [
    ["pramuwisata", "activity", 5],
    ["pemandu wisata", "activity", 5],
    ["tour guide", "activity", 5],
    ["guide wisata", "activity", 5],
  ],

  "93294": [
    ["wisata gua", "activity", 5],
    ["wisata pemandian", "activity", 5],
    ["petualangan alam", "activity", 5],
    ["wisata alam", "activity", 4],
  ],

  "93295": [
    ["wisata pantai", "activity", 5],
    ["pantai wisata", "entity", 5],
    ["rekreasi pantai", "activity", 4],
  ],

  "93297": [
    ["wisata tirta", "activity", 5],
    ["wisata bahari", "activity", 5],
    ["wisata laut", "activity", 5],
    ["aktivitas wisata bahari", "activity", 5],
    ["rekreasi air", "activity", 4],
  ],

  // ==========================================================
  // E. KONSTRUKSI
  // ==========================================================

  "41011": [
    ["konstruksi gedung hunian", "activity", 5],
    ["pembangunan rumah", "activity", 5],
    ["pembangunan perumahan", "activity", 5],
  ],

  "41012": [
    ["konstruksi gedung perkantoran", "activity", 5],
    ["pembangunan kantor", "activity", 5],
  ],

  "41013": [
    ["konstruksi gedung industri", "activity", 5],
    ["pembangunan gedung industri", "activity", 5],
  ],

  "41014": [
    ["konstruksi gedung perbelanjaan", "activity", 5],
    ["pembangunan pusat perbelanjaan", "activity", 5],
  ],

  "41015": [
    ["konstruksi gedung kesehatan", "activity", 5],
    ["pembangunan rumah sakit", "activity", 5],
    ["pembangunan fasilitas kesehatan", "activity", 5],
  ],

  "41016": [
    ["konstruksi gedung pendidikan", "activity", 5],
    ["pembangunan sekolah", "activity", 5],
    ["pembangunan fasilitas pendidikan", "activity", 5],
  ],

  "41017": [
    ["konstruksi gedung penginapan", "activity", 5],
    ["pembangunan hotel", "activity", 5],
    ["pembangunan penginapan", "activity", 5],
  ],

  "42101": [
    ["konstruksi jalan", "activity", 5],
    ["pembangunan jalan", "activity", 5],
    ["perbaikan jalan", "activity", 4],
  ],

  "42102": [
    ["pembangunan jembatan", "activity", 5],
    ["konstruksi jembatan", "activity", 5],
    ["jalan layang", "entity", 4],
  ],

  "42913": [
    ["konstruksi pelabuhan perikanan", "activity", 5],
    ["pembangunan pelabuhan perikanan", "activity", 5],
  ],

  "42915": [
    ["pembangunan pelindung pantai", "activity", 5],
    ["konstruksi pelindung pantai", "activity", 5],
    ["talud pantai", "entity", 4],
  ],

  // ==========================================================
  // F. PERTAMBANGAN
  // ==========================================================

  "07221": [
    ["pertambangan emas", "activity", 5],
    ["tambang emas", "activity", 5],
    ["bijih emas", "entity", 5],
    ["pertambangan emas dan perak", "activity", 5],
  ],

  "07295": [
    ["pertambangan nikel", "activity", 5],
    ["tambang nikel", "activity", 5],
    ["bijih nikel", "entity", 5],
  ],

  "06100": [
    ["pertambangan minyak bumi", "activity", 5],
    ["tambang minyak", "activity", 5],
    ["minyak bumi", "entity", 4],
  ],

  "06201": [
    ["pertambangan gas alam", "activity", 5],
    ["tambang gas", "activity", 5],
    ["gas alam", "entity", 4],
  ],

  // ==========================================================
  // G. INFORMASI DAN KOMUNIKASI
  // ==========================================================

  "61101": [
    ["telekomunikasi dengan kabel", "activity", 5],
    ["jaringan telekomunikasi kabel", "entity", 5],
  ],

  "61102": [
    ["telekomunikasi nirkabel", "activity", 5],
    ["jaringan seluler", "entity", 5],
    ["jaringan wireless", "entity", 5],
    ["internet seluler", "entity", 4],
  ],

  "61103": [
    ["telekomunikasi satelit", "activity", 5],
    ["internet satelit", "entity", 5],
    ["jaringan satelit", "entity", 5],
  ],

  "61104": [
    ["jasa akses internet", "activity", 5],
    ["internet service provider", "entity", 5],
    ["penyedia internet", "entity", 5],
    ["akses internet", "entity", 4],
  ],

  "61905": [
    ["telekomunikasi satelit", "activity", 5],
    ["layanan satelit", "activity", 4],
  ],

  // ==========================================================
  // H. LISTRIK
  // ==========================================================

  "35111": [
    ["pembangkit listrik", "activity", 5],
    ["pembangkit listrik tenaga diesel", "activity", 5],
    ["PLTD", "entity", 5],
    ["listrik diesel", "entity", 4],
  ],

  "35112": [
    ["pembangkit listrik tenaga gas", "activity", 5],
    ["PLTG", "entity", 5],
  ],

  "35121": [
    ["pembangkit listrik tenaga surya", "activity", 5],
    ["PLTS", "entity", 5],
    ["energi surya", "entity", 4],
    ["panel surya", "entity", 4],
  ],

  "35122": [
    ["pembangkit listrik tenaga air", "activity", 5],
    ["PLTA", "entity", 5],
    ["energi hidro", "entity", 4],
  ],

  // ==========================================================
  // I. PERDAGANGAN
  // ==========================================================

  "47111": [
    ["supermarket", "entity", 5],
    ["minimarket", "entity", 5],
    ["swalayan", "entity", 5],
    ["perdagangan eceran makanan", "activity", 4],
  ],

  "47212": [
    ["perdagangan buah", "activity", 5],
    ["penjualan buah", "activity", 5],
    ["buah-buahan", "entity", 4],
  ],

  "47213": [
    ["perdagangan sayuran", "activity", 5],
    ["penjualan sayuran", "activity", 5],
  ],

  "47215": [
    ["penjualan ikan", "activity", 5],
    ["perdagangan ikan", "activity", 5],
    ["hasil perikanan", "entity", 4],
    ["perdagangan eceran hasil perikanan", "activity", 5],
    ["penjualan hasil perikanan", "activity", 4],
    ["penjualan hasil laut", "activity", 4],
  ],

  "47781": [
    ["cendera mata", "entity", 5],
    ["souvenir", "entity", 5],
    ["kerajinan", "entity", 5],
    ["kerajinan lokal", "entity", 5],
    ["oleh-oleh", "entity", 4],
  ],

  // ==========================================================
  // J. KESEHATAN
  // ==========================================================

  "86101": [
    ["rumah sakit pemerintah", "activity", 5],
    ["rumah sakit", "entity", 4],
    ["RS pemerintah", "entity", 5],
  ],

  "86103": [
    ["rumah sakit swasta", "activity", 5],
    ["RS swasta", "entity", 5],
    ["rumah sakit", "entity", 4],
  ],

  // ==========================================================
  // K. PENDIDIKAN
  // ==========================================================

  "85101": [
    ["taman kanak-kanak", "activity", 5],
    ["TK", "entity", 5],
  ],

  "85201": [
    ["sekolah dasar", "activity", 5],
    ["SD", "entity", 5],
    ["pendidikan dasar", "activity", 4],
  ],

  "85311": [
    ["sekolah menengah pertama", "activity", 5],
    ["SMP", "entity", 5],
    ["pendidikan menengah pertama", "activity", 5],
  ],

  // ==========================================================
  // L. PEMERINTAHAN
  // ==========================================================

  "84119": [
    ["administrasi pemerintahan", "activity", 5],
    ["kegiatan pemerintahan", "activity", 4],
    ["pemerintah daerah", "entity", 4],
  ],

  "84121": [
    ["pelayanan pemerintah bidang pendidikan", "activity", 5],
    ["administrasi pendidikan pemerintah", "activity", 5],
  ],

  "84122": [
    ["pelayanan pemerintah bidang kesehatan", "activity", 5],
    ["administrasi kesehatan pemerintah", "activity", 5],
  ],

};

// ============================================================
// 3. MEMBENTUK KEYWORDS_LEVEL5
// ============================================================
//
// Semua level 5 mendapatkan nama resmi sebagai keyword.
// Dengan demikian kita tidak perlu menulis 1.559 kode manual.
//

const KEYWORDS_LEVEL5 = {};

function addKeyword(kode, keyword, tipe, bobot) {
  if (!keyword) return;

  if (!KEYWORDS_LEVEL5[kode]) {
    KEYWORDS_LEVEL5[kode] = [];
  }

  const exists = KEYWORDS_LEVEL5[kode].some(
    ([existing]) =>
      existing.toLowerCase().trim() === keyword.toLowerCase().trim()
  );

  if (!exists) {
    KEYWORDS_LEVEL5[kode].push([
      keyword.trim(),
      tipe,
      bobot,
    ]);
  }
}

// ============================================================
// 4. SEED OTOMATIS SELURUH KBLI LEVEL 5
// ============================================================

const level5 = KBLI.filter(
  (item) =>
    Number(item.level) === 5 &&
    Number(item.aktif) === 1
);

console.log(`Total KBLI level 5: ${level5.length}`);

for (const item of level5) {

  // Nama resmi KBLI
  addKeyword(
    item.kode,
    item.nama,
    "activity",
    4
  );

  // Uraian jika berbeda dari nama
  if (
    item.uraian &&
    item.uraian.trim().toLowerCase() !==
      item.nama.trim().toLowerCase()
  ) {
    addKeyword(
      item.kode,
      item.uraian,
      "activity",
      4
    );
  }
}

// ============================================================
// 5. TAMBAHKAN KEYWORD KHUSUS RAJA AMPAT
// ============================================================

for (const [kode, words] of Object.entries(CURATED_LEVEL5)) {
  for (const [keyword, tipe, bobot] of words) {
    addKeyword(kode, keyword, tipe, bobot);
  }
}

// ============================================================
// 6. DATABASE STATEMENT
// ============================================================

const getKbliByKode = db.prepare(`
  SELECT id
  FROM kbli_2025
  WHERE kode = ?
    AND level = 5
    AND aktif = 1
`);

const insertKw = db.prepare(`
  INSERT INTO kbli_keyword
    (kbli_id, keyword, tipe, bobot, match_type)
  VALUES
    (?, ?, ?, ?, 'phrase')
  ON CONFLICT(kbli_id, keyword)
  DO UPDATE SET
    tipe = excluded.tipe,
    bobot = excluded.bobot,
    match_type = 'phrase',
    aktif = 1
`);

// ============================================================
// 7. INSERT / UPDATE
// ============================================================

let inserted = 0;
let skipped = 0;
let totalKeyword = 0;

const tx = db.transaction(() => {

  for (const [kode, words] of Object.entries(KEYWORDS_LEVEL5)) {

    const kbli = getKbliByKode.get(kode);

    if (!kbli) {
      console.warn(
        `Kode KBLI level 5 ${kode} tidak ditemukan, dilewati.`
      );

      skipped++;
      continue;
    }

    for (const [keyword, tipe, bobot] of words) {

      insertKw.run(
        kbli.id,
        keyword,
        tipe,
        bobot
      );

      inserted++;
      totalKeyword++;
    }
  }
});

tx();

// ============================================================
// 8. HASIL
// ============================================================

const totalDb = db.prepare(`
  SELECT COUNT(*) AS jumlah
  FROM kbli_keyword kk
  JOIN kbli_2025 k
    ON k.id = kk.kbli_id
  WHERE k.level = 5
    AND kk.aktif = 1
`).get();

const totalKbliWithKeyword = db.prepare(`
  SELECT COUNT(DISTINCT kk.kbli_id) AS jumlah
  FROM kbli_keyword kk
  JOIN kbli_2025 k
    ON k.id = kk.kbli_id
  WHERE k.level = 5
    AND kk.aktif = 1
`).get();

console.log("");
console.log("==========================================");
console.log("SEED KEYWORD KBLI LEVEL 5");
console.log("==========================================");
console.log(`KBLI level 5 dari JSON : ${level5.length}`);
console.log(`KBLI level 5 dengan keyword : ${totalKbliWithKeyword.jumlah}`);
console.log(`Keyword diproses : ${totalKeyword}`);
console.log(`Kode tidak ditemukan : ${skipped}`);
console.log(`Total keyword level 5 di DB : ${totalDb.jumlah}`);
console.log("==========================================");
console.log("Selesai.");