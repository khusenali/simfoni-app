// lib/textmining.js
// Modul text mining sederhana & gratis (tanpa API berbayar):
//  1. extractKeywords  -> frekuensi kata setelah stopword removal
//  2. analyzeSentiment -> pendekatan lexicon-based Bahasa Indonesia
//  3. detectSektor     -> pencocokan kata kunci ke sektor ekonomi BPS
//
// Pendekatan ini bisa ditingkatkan nanti ke model NLP (mis. IndoBERT via
// HuggingFace Inference API gratis) tanpa mengubah kontrak fungsi di bawah.

const STOPWORDS = new Set(
  (
      // kata dasar & konjungsi umum
  "yang dan di ke dari pada untuk dengan adalah ini itu atau juga akan " +
  "tidak dalam oleh sudah saat karena namun sehingga secara telah para " +
  "kata dua tahun kami kita mereka dia nya per bagi lebih agar jadi " +
  "sebagai dapat maupun antara serta hingga jika saja begitu bahkan " +
  "seperti masih belum sangat cukup banyak sedikit terus kembali " +
  "menjadi merupakan sebuah suatu ada hal cara guna sekitar " +

  // ganti orang & penunjuk (formal saja, versi informal dihapus)
  "saya anda ia beliau kalian sini sana situ " +

  // modalitas
  "yaitu yakni bukan harus mesti perlu bisa boleh " +

  // kuantitas & keseluruhan
  "semua seluruh segala setiap tiap beberapa sebagian lain lainnya " +
  "sama hampir satu tiga empat lima orang waktu " +

  // konjungsi waktu & sebab-akibat
  "meski meskipun walau walaupun kalau bila ketika sewaktu sebelum " +
  "sesudah setelah selama sejak terhadap tentang mengenai " +

  // urutan & keterangan waktu
  "kemudian lalu selanjutnya pertama kedua ketiga misalnya contohnya " +
  "adapun demikian tersebut tadi nanti sekarang kini dulu lama baru " +
  "pernah sedang " +

  // === khusus berita ===

  // verba pengutipan / atribusi narasumber
  "ujar tutur ungkap terang jelas sebut imbuh tambah lanjut " +
  "menurut menuturkan mengatakan menjelaskan menyebutkan menambahkan " +
  "mengungkapkan menerangkan menegaskan melanjutkan menyampaikan " +
  "menuding menilai memaparkan " +

  // boilerplate media & sumber
  "dilansir dikutip berdasarkan laporan sumber wartawan tim redaksi " +
  "diberitakan disampaikan diketahui tercatat dilaporkan " +

  // hari, tanggal, jam (sering jadi noise di dateline berita)
  "senin selasa rabu kamis jumat sabtu minggu " +
  "januari februari maret april mei juni juli agustus september " +
  "oktober november desember " +
  "wib wita wit pukul tanggal " +

  // frasa umum berita
  "sebelumnya diketahui bahwa terkait pihak pihaknya kasus tersebut " +
  "diduga resmi kembali digelar berlangsung").split(" ")
);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

function extractKeywords(text, limit = 8) {
  const tokens = tokenize(text);
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

// Leksikon ringkas Bahasa Indonesia untuk konteks ekonomi/berita daerah.
// Silakan diperluas sesuai kebutuhan domain (mis. istilah perikanan, pariwisata).
const POSITIVE_WORDS = [
  // Umum & sentimen dasar
  "naik", "meningkat", "tumbuh", "membaik", "surplus", "untung", "meriah",
  "ramai", "penuh", "bertambah", "positif", "sukses", "berhasil", "lancar",
  "stabil", "pulih", "rekor", "disahkan", "diresmikan", "dibuka", "baru",
  "mendukung", "menguat", "melonjak", "panen", "berkembang", "membangun",
  "membaiknya", "kenaikan", "peningkatan", "keuntungan",
  "meroket", "melejit", "membaik pesat", "signifikan", "mengesankan",
  "gemilang", "cemerlang", "membanggakan", "mengalami kemajuan",
  "terobosan", "inovatif", "unggul", "unggulan", "terbaik", "istimewa",
  "apresiasi", "diapresiasi", "diakui", "membanggakan bangsa",
  "menjanjikan", "optimis", "optimisme", "harapan baru",

  // Investasi & Usaha
  "investasi", "berinvestasi", "ekspansi", "ekspansi usaha",
  "beroperasi", "berproduksi", "produksi meningkat", "produktif",
  "produktivitas", "bertumbuh", "prospektif", "potensial",
  "penanaman modal", "investor asing", "modal masuk", "pendanaan",
  "suntikan dana", "capital inflow", "menarik investor",
  "pertumbuhan ekonomi", "roda ekonomi", "geliat ekonomi",
  "menggeliat", "bangkit", "kebangkitan", "pemulihan ekonomi",

  // Perdagangan
  "pasokan aman", "stok aman", "pasokan meningkat",
  "permintaan meningkat", "penjualan meningkat",
  "daya beli meningkat", "ekspor meningkat",
  "transaksi meningkat", "pasar ramai",
  "neraca perdagangan surplus", "nilai tukar menguat",
  "harga terjangkau", "diskon", "promo", "laris", "laris manis",
  "omzet meningkat", "pendapatan meningkat", "cuan",

  // Pariwisata
  "kunjungan meningkat", "wisatawan meningkat",
  "okupansi meningkat", "hunian meningkat",
  "destinasi baru", "festival", "event", "promosi wisata",
  "daya tarik wisata", "wisata unggulan", "geliat pariwisata",
  "pesona wisata", "spot foto", "instagramable",

  // Perikanan & Pertanian
  "hasil tangkap meningkat", "hasil panen meningkat",
  "musim panen", "hasil melimpah",
  "nelayan melaut", "budidaya berkembang",
  "swasembada", "lumbung pangan", "ketahanan pangan",
  "panen raya", "bibit unggul", "hasil melimpah ruah",

  // Infrastruktur
  "jalan dibuka", "jembatan selesai", "pelabuhan beroperasi",
  "bandara beroperasi", "akses lancar",
  "pembangunan selesai", "rehabilitasi",
  "diresmikan langsung", "tersambung", "konektivitas meningkat",
  "infrastruktur memadai", "renovasi rampung", "pembangunan rampung",
  "peningkatan jalan", "jalan mulus",

  // Keuangan
  "realisasi", "terealisasi", "insentif",
  "subsidi", "stimulus", "efisien",
  "optimal", "optimalisasi", "terkendali",
  "inflasi terkendali", "harga stabil",
  "anggaran terserap", "penerimaan meningkat", "pajak meningkat",
  "pendapatan negara", "cadangan devisa", "rating investasi",
  "kredit lancar", "likuiditas terjaga",

  // Ketenagakerjaan
  "lapangan kerja", "penyerapan tenaga kerja",
  "perekrutan", "membuka lapangan kerja",
  "angka pengangguran turun", "gaji naik", "upah naik",
  "tenaga kerja terserap", "peluang kerja",

  // Pemerintahan & Kebijakan
  "kebijakan baru", "program bantuan", "bantuan sosial",
  "bansos", "subsidi tepat sasaran", "reformasi birokrasi",
  "pelayanan publik membaik", "transparansi", "akuntabel",
  "efektif", "tepat sasaran", "percepatan pembangunan",
  "kerja sama", "nota kesepahaman", "mou", "kesepakatan",
  "diplomasi berhasil", "hubungan bilateral menguat",

  // Pendidikan
  "beasiswa", "prestasi", "berprestasi", "juara", "lulus",
  "akreditasi meningkat", "fasilitas pendidikan membaik",
  "kualitas pendidikan meningkat", "angka melek huruf meningkat",
  "wisuda", "kelulusan", "gelar",

  // Kesehatan
  "sembuh", "angka kesembuhan meningkat", "vaksinasi",
  "layanan kesehatan membaik", "fasilitas kesehatan lengkap",
  "penurunan kasus", "terkendali", "bebas penyakit",
  "gizi membaik", "stunting turun", "angka kematian turun",

  // Olahraga
  "menang", "kemenangan", "juara umum", "medali emas",
  "prestasi gemilang", "rekor baru", "raih medali",
  "melaju ke final", "lolos", "unggul", "comeback",

  // Lingkungan
  "ramah lingkungan", "hijau", "konservasi berhasil",
  "penghijauan", "energi terbarukan", "emisi turun",
  "kualitas udara membaik", "reboisasi",

  // Hukum & Keamanan
  "kondusif", "aman terkendali", "tertib", "damai",
  "penegakan hukum tegas", "kasus terungkap", "berhasil diamankan",

  // Umum
  "kolaborasi", "sinergi", "kemitraan",
  "berdaya saing", "berkelanjutan",
  "digitalisasi", "modernisasi",
  "transformasi digital", "efisiensi meningkat", "inklusif",
  "pemberdayaan", "kemandirian", "swadaya", "gotong royong"
];

const NEGATIVE_WORDS = [
  // Umum & sentimen dasar
  "turun", "menurun", "rusak", "parah", "anjlok", "merugi", "kerugian",
  "sepi", "gagal", "terhambat", "krisis", "langka", "kelangkaan", "mahal",
  "melonjak tajam", "bencana", "banjir", "longsor", "kekurangan", "defisit",
  "korupsi", "penurunan", "kemacetan", "kecelakaan", "pencemaran", "tercemar",
  "kekeringan", "gagal panen", "tidak melaut", "pemadaman", "terputus",
  "keluhan", "protes", "demo", "pengangguran",
  "memburuk", "terpuruk", "terjun bebas", "amblas", "runtuh", "ambruk",
  "hancur", "musnah", "lumpuh", "kacau", "semrawut", "buruk",
  "mengkhawatirkan", "memprihatinkan", "meresahkan", "mengecewakan",
  "disesalkan", "dikecam", "dikritik", "kritik tajam", "kecaman",
  "kontroversi", "polemik", "sorotan tajam", "tragedi", "musibah",

  // Investasi & Usaha
  "bangkrut", "pailit", "tutup", "ditutup",
  "gulung tikar", "phk", "pemutusan hubungan kerja",
  "usaha lesu", "penjualan turun",
  "permintaan turun", "daya beli melemah",
  "investor kabur", "modal keluar", "capital outflow",
  "saham anjlok", "pasar lesu", "omzet anjlok", "pendapatan turun",
  "rugi besar", "kerugian besar", "efisiensi karyawan", "perampingan",

  // Perdagangan
  "pasokan terganggu", "stok menipis",
  "distribusi terganggu", "harga naik",
  "inflasi tinggi", "inflasi meningkat",
  "ekspor menurun", "impor menurun",
  "harga melambung", "harga melonjak", "spekulan", "penimbunan",
  "barang palsu", "produk ilegal", "penyelundupan barang",
  "neraca perdagangan defisit", "nilai tukar melemah", "rupiah melemah",

  // Pariwisata
  "kunjungan menurun", "wisatawan menurun",
  "okupansi turun", "hotel sepi",
  "destinasi sepi",
  "wisatawan sepi", "objek wisata terbengkalai", "fasilitas rusak",

  // Perikanan & Pertanian
  "hasil tangkap menurun",
  "hasil panen menurun",
  "gagal melaut",
  "cuaca buruk",
  "gelombang tinggi",
  "abrasi",
  "hama",
  "penyakit tanaman",
  "gagal tanam", "puso", "lahan kritis", "irigasi rusak",
  "harga anjlok", "hasil laut menyusut", "tangkapan minim",

  // Infrastruktur
  "jalan rusak", "jembatan rusak",
  "akses terhambat", "pelabuhan ditutup",
  "bandara ditutup",
  "jalan berlubang", "jalan ambles", "jalan longsor",
  "proyek mangkrak", "pembangunan terhenti", "belum rampung",
  "pembangunan molor", "terbengkalai",

  // Keuangan
  "utang", "tunggakan",
  "anggaran dipotong",
  "realisasi rendah",
  "serapan rendah",
  "utang menumpuk", "gagal bayar", "default", "defisit anggaran",
  "penerimaan pajak turun", "beban utang", "cadangan devisa menyusut",
  "kredit macet", "likuiditas ketat", "suku bunga naik",

  // Ketenagakerjaan
  "phk massal", "dirumahkan", "upah tidak dibayar", "gaji tertunda",
  "buruh migran bermasalah", "pekerja anak", "eksploitasi pekerja",

  // Pemerintahan & Kebijakan
  "penyalahgunaan wewenang", "penyelewengan", "mark up",
  "penyimpangan anggaran", "birokrasi berbelit", "pelayanan buruk",
  "maladministrasi", "kebijakan kontroversial", "ditolak", "penolakan",
  "gagal bayar utang negara", "diprotes warga", "digugat",
  "mangkir", "molor", "tumpang tindih",

  // Pendidikan
  "putus sekolah", "kekurangan guru", "fasilitas minim",
  "sekolah rusak", "nilai rendah", "gagal ujian", "drop out",
  "kualitas pendidikan menurun", "buta huruf",

  // Kesehatan
  "wabah", "kasus meningkat", "meninggal dunia", "korban jiwa",
  "keracunan", "gizi buruk", "stunting", "kekurangan obat",
  "fasilitas kesehatan minim", "layanan kesehatan buruk",
  "penyakit menular", "klaster baru", "lonjakan kasus",

  // Olahraga
  "kalah", "kekalahan", "tersingkir", "gugur", "gagal lolos",
  "cedera", "diskualifikasi", "skorsing", "performa menurun",

  // Keamanan & Sosial
  "konflik", "kerusuhan",
  "kriminalitas", "pencurian",
  "penyelundupan",
  "perampokan", "penipuan", "pemerasan", "kekerasan",
  "bentrok", "tawuran", "teror", "ancaman", "intimidasi",
  "penculikan", "pembunuhan", "narkoba", "peredaran narkoba",

  // Hukum
  "ditangkap", "diperiksa", "tersangka", "terdakwa", "divonis",
  "dipenjara", "diadili", "pelanggaran hukum", "penyelidikan",
  "diselidiki", "kasus hukum", "sidang", "tuntutan",

  // Lingkungan
  "cuaca ekstrem", "angin kencang",
  "gelombang ekstrem",
  "kebakaran hutan",
  "kebakaran lahan",
  "pencemaran laut",
  "kerusakan lingkungan", "deforestasi", "penggundulan hutan",
  "limbah", "polusi", "polusi udara", "sampah menumpuk",
  "banjir bandang", "tanah longsor", "gempa", "erupsi",

  // Umum
  "melemah", "perlambatan",
  "stagnan", "tertunda",
  "tertahan", "terlambat",
  "bermasalah", "terancam",
  "rawan", "risiko tinggi",
  "darurat", "siaga", "waspada", "genting", "kritis",
  "tidak stabil", "tidak kondusif", "meresahkan warga"
];

// Kata negasi Bahasa Indonesia -- kalau muncul persis sebelum kata
// sentimen (dalam kalimat yang sama), polaritasnya dibalik.
const NEGATION_WORDS = ["tidak", "tak", "bukan", "belum", "jangan", "tanpa", "kurang", "gagal", "batal", "menolak"];
const NEGATION_WINDOW = 25; // jumlah karakter yang dicek ke belakang, cukup ~3-4 kata

function hasNegationBefore(lower, matchIndex) {
  const start = Math.max(0, matchIndex - NEGATION_WINDOW);
  let before = lower.slice(start, matchIndex);
  // Jangan nyebrang ke kalimat sebelumnya -- potong di titik/koma/baris baru terakhir,
  // biar negasi di kalimat lain gak keikut ngaruh ke kata sentimen kalimat ini.
  const lastBoundary = Math.max(before.lastIndexOf("."), before.lastIndexOf(","), before.lastIndexOf("\n"));
  if (lastBoundary !== -1) before = before.slice(lastBoundary + 1);
  return NEGATION_WORDS.some((n) => new RegExp(`\\b${n}\\b`).test(before));
}

function analyzeSentiment(text) {
  const lower = (text || "").toLowerCase();
  let score = 0;
  for (const w of POSITIVE_WORDS) {
    const idx = lower.indexOf(w);
    if (idx === -1) continue;
    score += hasNegationBefore(lower, idx) ? -1 : 1;
  }
  for (const w of NEGATIVE_WORDS) {
    const idx = lower.indexOf(w);
    if (idx === -1) continue;
    score += hasNegationBefore(lower, idx) ? 1 : -1;
  }
  if (score > 0) return "Positif";
  if (score < 0) return "Negatif";
  return "Netral";
}

// Peta kata kunci -> sektor ekonomi, dipakai untuk pra-isi (bisa dikoreksi manual
// oleh Tim Neraca saat validasi).
const SEKTOR_KEYWORDS = {
  "Pertanian, Kehutanan, dan Perikanan": [
    "petani", "sawah", "kebun", "panen", "pertanian", "hasil bumi",
    "nelayan", "ikan", "melaut", "tangkapan", "perikanan", "budidaya",
    "hutan", "kehutanan", "kayu", "hasil hutan",
  ],
  "Pertambangan dan Penggalian": [
    "tambang", "pertambangan", "galian", "batu", "pasir", "mineral",
    "eksplorasi", "izin tambang", "quarry",
  ],
  "Industri Pengolahan": [
    "pabrik", "industri", "produksi", "olahan", "manufaktur",
    "pengolahan ikan", "pengalengan", "pengrajin", "kerajinan",
  ],
  "Pengadaan Listrik dan Gas": [
    "listrik", "pln", "pemadaman", "gardu", "gas", "energi listrik", "jaringan listrik",
  ],
  "Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang": [
    "air bersih", "pdam", "sampah", "limbah", "daur ulang",
    "pengelolaan sampah", "sanitasi", "tps",
  ],
  "Konstruksi": [
    "jalan", "jembatan", "bangunan", "proyek", "konstruksi",
    "infrastruktur", "renovasi", "pembangunan",
  ],
  "Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor": [
    "umkm", "pasar", "dagang", "toko", "harga", "komoditas", "ekspor",
    "impor", "perdagangan", "bengkel", "reparasi", "suku cadang",
  ],
  "Transportasi dan Pergudangan": [
    "bandara", "pelabuhan", "penerbangan", "kapal", "transportasi",
    "pelayaran", "gudang", "logistik", "distribusi barang", "ekspedisi",
  ],
  "Penyediaan Akomodasi dan Makan Minum": [
    "hotel", "resort", "homestay", "penginapan", "restoran",
    "rumah makan", "kuliner", "wisatawan", "wisata", "turis",
    "destinasi", "diving", "snorkeling", "akomodasi",
  ],
  "Informasi dan Komunikasi": [
    "internet", "sinyal", "telekomunikasi", "jaringan", "provider",
    "menara bts", "komunikasi", "media online",
  ],
  "Jasa Keuangan dan Asuransi": [
    "bank", "kredit", "pinjaman", "asuransi", "keuangan", "koperasi", "tabungan",
  ],
  "Real Estat": [
    "tanah", "properti", "perumahan", "sewa rumah", "sertifikat tanah", "real estat",
  ],
  "Jasa Perusahaan": [
    "konsultan", "jasa profesional", "outsourcing", "jasa perusahaan",
    "sewa alat", "jasa hukum",
  ],
  "Administrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib": [
    "apbd", "pemkab", "dinas", "bupati", "pemerintah", "anggaran",
    "opd", "tni", "polri", "jaminan sosial", "bpjs",
  ],
  "Jasa Pendidikan": [
    "sekolah", "pendidikan", "guru", "siswa", "kampus", "universitas", "beasiswa",
  ],
  "Jasa Kesehatan dan Kegiatan Sosial": [
    "puskesmas", "rumah sakit", "kesehatan", "posyandu", "bidan", "dokter", "layanan sosial", "stunting"
  ],
  "Jasa Lainnya": [
    "salon", "laundry", "jasa reparasi", "hiburan", "bengkel kecil",
  ],
};

// Nama sektor yang dipakai sebagai KEY di SEKTOR_KEYWORDS di atas sengaja
// dibiarkan apa adanya (tidak perlu diubah tiap kali penamaan resmi sektor
// berubah) -- pemetaan ke nama TAMPILAN terbaru (yang tersimpan di tabel
// `sektor`) dilakukan di sini, satu tempat saja. Kalau nama sektor di database
// berubah lagi nanti, cukup update value di map ini.
const SEKTOR_DISPLAY_NAME = {
  "Pertanian, Kehutanan, dan Perikanan": "A. Pertanian, Kehutanan, dan Perikanan",
  "Pertambangan dan Penggalian": "B. Pertambangan dan Penggalian",
  "Industri Pengolahan": "C. Industri Pengolahan",
  "Pengadaan Listrik dan Gas": "D. Pengadaan Listrik dan Gas",
  "Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang": "E. Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang",
  "Konstruksi": "F. Konstruksi",
  "Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor": "G. Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor",
  "Transportasi dan Pergudangan": "H. Transportasi dan Pergudangan",
  "Penyediaan Akomodasi dan Makan Minum": "I. Penyediaan Akomodasi dan Makan Minum",
  "Informasi dan Komunikasi": "J. Informasi dan Komunikasi",
  "Jasa Keuangan dan Asuransi": "K. Jasa Keuangan dan Asuransi",
  "Real Estat": "L. Real Estat",
  "Jasa Perusahaan": "M, N. Jasa Perusahaan",
  "Adminstrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib": "O. Administrasi Pemerintahan, Pertahanan, dan Jaminan Sosial Wajib",
  "Jasa Pendidikan": "P. Jasa Pendidikan",
  "Jasa Kesehatan dan Kegiatan Sosial": "Q. Jasa Kesehatan dan Kegiatan Sosial",
  "Jasa Lainnya": "R, S, T, U. Jasa Lainnya",
};

function detectSektor(text) {
  const lower = (text || "").toLowerCase();
  for (const [sektor, kws] of Object.entries(SEKTOR_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) return SEKTOR_DISPLAY_NAME[sektor] || sektor;
  }
  return null;
}

// Kata kunci lokalitas Raja Ampat — dipakai oleh scraper portal berita & media
// sosial untuk memastikan hanya konten yang benar-benar terkait Kabupaten Raja
// Ampat yang disimpan (aturan: "3 sumber" data wajib relevan dengan Raja Ampat).
const RAJA_AMPAT_LOCALITY = [
    "MISOOL BARAT","KAPATCOL","LILINTA","BIGA","MAGEI","GAMTA",
    "MISOOL SELATAN","DABATAN","YELLU","HARAPAN JAYA","KAREYEPOP","FAFANLAP","DESA PERSIAPAN GALEMTA",
    "MISOOL TIMUR","FOLLEY","TOMOLOL","USAHA JAYA","AUDAM","LIMALAS TIMUR","LIMALAS BARAT",
    "MISOOL","WAIGAMA","ADUWEI","SALAFEN","SOLAL","ATKARI",
    "KEPULAUAN SEMBILAN","PULAU TIKUS","WEJIM BARAT","WEJIM TIMUR","SATUKURANO",
    "KOFIAU","TOLOBI","BALAL","AWAT","MIKIRAN","DEER",
    "SALAWATI TENGAH","WAILABU","WAIJAN","WAIMECI","WAIBU","WAILEN","SAKABU","KALOBO",
    "SALAWATI UTARA","KAPATLAP","WAIDIM","SAMATE","WAMEGA","JEFMAN BARAT","JEFMAN TIMUR",
    "SALAWATI BARAT","KALWAL","KALIAM","WAIBON","SOLOL",
    "BATANTA SELATAN","WAILEBET","WAIMAN","YENANAS","AMDUI",
    "BATANTA UTARA","YENSAWAI TIMUR","YENSAWAI BARAT","AREFI SELATAN","AREFI TIMUR",
    "WAIGEO BARAT KEPULAUAN","PAM","SAUPAPIR","SAUKABU","MEOSMANGGARA","MANYAIFUN","GAG",
    "MEOS MANSAR","YENBEKWAN","KAPISAWAR","KABUY","SAWINGGRAI","YENWAOUPNOR","YENBUBA","ARBOREK","KURKAPA","SAUANDAREK",
    "WAIGEO SELATAN","YENBESER","FRIWEN","SAONEK","SAPORKREN","WAWIYAI",
    "KOTA WAISAI","SAPORDANCO","WAISAI","BONKAWIR","WARMASEN",
    "TELUK MAYALIBIT","LOPINTOL","WARSAMDIN","MUMES","KALITOKO",
    "TIPLOL MAYALIBIT","WAIFOI","ARAWAI","KABILOL","GO","BEO","WARIMAK",
    "WAIGEO TIMUR","YENSNER","URBINASOPEN","YENBEKAKI","PUPER",
    "WARWARBOMI","WARKORI","BONI","WARWANAI","MNIER",
    "WAIGEO UTARA","KALISADE","BONSAYOR","KABARE","DARUMBAB","ANDEY","ASUKWERI",
    "SUPNIN","RAUKI","URAI","DUBER","KAPADIRI",
    "WAIGEO BARAT","SELPELE","SALYO","WAISILIP","MUTUS","BIANCI",
    "AYAU","YENKANFAN","RUNI","DOREHKAR","BOISERAN","YENKAWIR",
    "KEPULAUAN AYAU","MEOSBEKWAN","ABIDON","RUTUM","RENI",
];

// Pencocokan KATA UTUH (word boundary), bukan potongan huruf di mana saja —
// supaya "GO" (kampung di Tiplol Mayalibit) tidak nyangkut ke "diGOel" atau
// "angGOta", "GAG" (Pulau Gag) tidak nyangkut ke "GAGal", "URAI" (Supnin)
// tidak nyangkut ke "mengURAI", dst.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildWordBoundaryRegexes(list) {
  return list.map((k) => new RegExp(`\\b${escapeRegex(k.toLowerCase())}\\b`, "i"));
}

const RAJA_AMPAT_LOCALITY_REGEXES = buildWordBoundaryRegexes(RAJA_AMPAT_LOCALITY);
const RAJA_AMPAT_GENERAL_TERMS = ["raja ampat", "kabupaten raja ampat"];
const RAJA_AMPAT_GENERAL_REGEXES = buildWordBoundaryRegexes(RAJA_AMPAT_GENERAL_TERMS);

function isRajaAmpatRelated(title, content) {
  const titleText = title || "";
  const contentText = content || "";

  if (RAJA_AMPAT_LOCALITY_REGEXES.some((re) => re.test(titleText))) return true;
  if (RAJA_AMPAT_GENERAL_REGEXES.some((re) => re.test(titleText))) return true;
  if (RAJA_AMPAT_LOCALITY_REGEXES.some((re) => re.test(contentText))) return true;

  return false;
}

const EXCLUDED_TITLE_PREFIXES = ["cerpen"];

function isExcludedContent(title) {
  const t = (title || "").toLowerCase().trim();
  return EXCLUDED_TITLE_PREFIXES.some((prefix) => t.startsWith(prefix));
}

function titleSimilarity(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (!setA.size || !setB.size) return 0;
  let intersect = 0;
  setA.forEach((w) => { if (setB.has(w)) intersect++; });
  const union = new Set([...setA, ...setB]).size;
  return intersect / union;
}

module.exports = { extractKeywords, analyzeSentiment, detectSektor, tokenize, isRajaAmpatRelated, titleSimilarity, isExcludedContent, escapeRegex, buildWordBoundaryRegexes };