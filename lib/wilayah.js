const DISTRIK_MAP = {
  "MISOOL BARAT":["KAPATCOL","LILINTA","BIGA","MAGEI","GAMTA"],
  "MISOOL SELATAN":["DABATAN","YELLU","HARAPAN JAYA","KAREYEPOP","FAFANLAP","DESA PERSIAPAN GALEMTA"],
  "MISOOL TIMUR":["FOLLEY","TOMOLOL","USAHA JAYA","AUDAM","LIMALAS TIMUR","LIMALAS BARAT"],
  "MISOOL":["WAIGAMA","ADUWEI","SALAFEN","SOLAL","ATKARI"],
  "KEPULAUAN SEMBILAN":["PULAU TIKUS","WEJIM BARAT","WEJIM TIMUR","SATUKURANO"],
  "KOFIAU":["TOLOBI","BALAL","AWAT","MIKIRAN","DEER"],
  "SALAWATI TENGAH":["WAILABU","WAIJAN","WAIMECI","WAIBU","WAILEN","SAKABU","KALOBO"],
  "SALAWATI UTARA":["KAPATLAP","WAIDIM","SAMATE","WAMEGA","JEFMAN BARAT","JEFMAN TIMUR"],
  "SALAWATI BARAT":["KALWAL","KALIAM","WAIBON","SOLOL"],
  "BATANTA SELATAN":["WAILEBET","WAIMAN","YENANAS","AMDUI"],
  "BATANTA UTARA":["YENSAWAI TIMUR","YENSAWAI BARAT","AREFI SELATAN","AREFI TIMUR"],
  "WAIGEO BARAT KEPULAUAN":["PAM","SAUPAPIR","SAUKABU","MEOSMANGGARA","MANYAIFUN","GAG"],
  "MEOS MANSAR":["YENBEKWAN","KAPISAWAR","KABUY","SAWINGGRAI","YENWAOUPNOR","YENBUBA","ARBOREK","KURKAPA","SAUANDAREK"],
  "WAIGEO SELATAN":["YENBESER","FRIWEN","SAONEK","SAPORKREN","WAWIYAI"],
  "KOTA WAISAI":["SAPORDANCO","WAISAI","BONKAWIR","WARMASEN", "KANTOR BUPATI", "WAYAG", "POLRES", "PELABUHAN WAISAI", "RSUD", "KODIM", "DPRK", "MASJID AGUNG", "WTC", "MOKO", "BANDARA MARINDA", "KANTOR POS", "KANTOR BAPPEDA", "ALFA-OMEGA"],
  "TELUK MAYALIBIT":["LOPINTOL","WARSAMDIN","MUMES","KALITOKO"],
  "TIPLOL MAYALIBIT":["WAIFOI","ARAWAI","KABILOL","GO","BEO","WARIMAK"],
  "WAIGEO TIMUR":["YENSNER","URBINASOPEN","YENBEKAKI","PUPER"],
  "WARWARBOMI":["WARKORI","BONI","WARWANAI","MNIER"],
  "WAIGEO UTARA":["KALISADE","BONSAYOR","KABARE","DARUMBAB","ANDEY","ASUKWERI"],
  "SUPNIN":["RAUKI","URAI","DUBER","KAPADIRI"],
  "WAIGEO BARAT":["SELPELE","SALYO","WAISILIP","MUTUS","BIANCI"],
  "AYAU":["YENKANFAN","RUNI","DOREHKAR","BOISERAN","YENKAWIR"],
  "KEPULAUAN AYAU":["MEOSBEKWAN","ABIDON","RUTUM","RENI"],
};

// Pencocokan case-insensitive + kata utuh (word boundary) — bukan cuma
// lowercase manual yang gagal cocok, dan bukan substring sembarangan
// (supaya "GO" tidak nyangkut ke "diGOel", dst — sama seperti perbaikan
// isRajaAmpatRelated di textmining.js).
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Nama distrik sendiri ikut jadi kata kunci (bukan cuma nama kampung).
const DISTRIK_KEYWORD_ENTRIES = Object.entries(DISTRIK_MAP).flatMap(([distrik, kampungList]) =>
  [distrik, ...kampungList].map((keyword) => ({ distrik, keyword }))
);

// Diurutkan dari keyword TERPANJANG dulu supaya nama spesifik (mis. "KEPULAUAN
// AYAU") dicek sebelum yang lebih pendek & tumpang tindih (mis. "AYAU").
const DISTRIK_REGEX_ENTRIES = [...DISTRIK_KEYWORD_ENTRIES]
  .sort((a, b) => b.keyword.length - a.keyword.length)
  .map(({ distrik, keyword }) => ({
    distrik,
    regex: new RegExp(`\\b${escapeRegex(keyword.toLowerCase())}\\b`, "i"),
  }));

function detectDistrik(text) {
  const lower = (text || "").toLowerCase();
  for (const { distrik, regex } of DISTRIK_REGEX_ENTRIES) {
    if (regex.test(lower)) return distrik;
  }
  return null;
}

module.exports = { DISTRIK_MAP, detectDistrik };