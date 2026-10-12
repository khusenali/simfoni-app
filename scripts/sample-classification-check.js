// scripts/sample-classification-check.js
// Diagnostik: ambil sampel fenomena yang UDAH terklasifikasi (sentimen &
// sektor), dan tunjukin PERSIS kata kunci apa yang bikin dia dapet label
// sentimen segitu -- biar gampang dinilai manual apa hasilnya masuk akal
// atau meleset, bukan cuma liat outputnya doang tanpa tau alasannya.
// Gak nulis apa-apa ke database, cuma baca & lapor.
// Jalankan: node scripts/sample-classification-check.js
require("dotenv").config({ path: ".env.local" });
const { db } = require("../lib/db");
const { POSITIVE_WORDS, NEGATIVE_WORDS, hasNegationBefore } = require("../lib/textmining");

const JUMLAH_PER_KATEGORI = 8; // 8 Positif + 8 Netral + 8 Negatif = 24 total

function jejakKataKunci(text) {
  const lower = (text || "").toLowerCase();
  const ditemukan = [];
  for (const w of POSITIVE_WORDS) {
    const idx = lower.indexOf(w);
    if (idx === -1) continue;
    const dinegasi = hasNegationBefore(lower, idx);
    ditemukan.push(`${dinegasi ? "[dinegasi] " : ""}"${w}" (+)${dinegasi ? " -> jadi (-)" : ""}`);
  }
  for (const w of NEGATIVE_WORDS) {
    const idx = lower.indexOf(w);
    if (idx === -1) continue;
    const dinegasi = hasNegationBefore(lower, idx);
    ditemukan.push(`${dinegasi ? "[dinegasi] " : ""}"${w}" (-)${dinegasi ? " -> jadi (+)" : ""}`);
  }
  return ditemukan;
}

async function ambilSampel(sentimen, jumlah) {
  return await db.prepare(`
    SELECT f.id, f.judul, f.uraian, f.sentimen, f.status, s.nama AS sektor
    FROM fenomena f
    LEFT JOIN sektor s ON f.sektor_id = s.id
    WHERE f.sentimen = ?
    ORDER BY RANDOM()
    LIMIT ?
  `).all(sentimen, jumlah);
}

(async () => {
  console.log(`\n${"=".repeat(90)}`);
  console.log("SAMPEL PENGECEKAN KUALITAS TEXT MINING -- baca judul+uraian, bandingin sama");
  console.log("label sentimen & sektor yang di-assign otomatis. Kolom 'jejak kata kunci'");
  console.log("nunjukin PERSIS kata apa yang bikin dapet label sentimen itu.");
  console.log("=".repeat(90));

  for (const sentimen of ["Positif", "Netral", "Negatif"]) {
    const rows = await ambilSampel(sentimen, JUMLAH_PER_KATEGORI);
    console.log(`\n\n########## SENTIMEN: ${sentimen.toUpperCase()} (${rows.length} sampel) ##########`);
    rows.forEach((r, i) => {
      const jejak = jejakKataKunci(`${r.judul} ${r.uraian || ""}`);
      console.log(`\n[${i + 1}] id=${r.id} | sektor=${r.sektor || "-"} | status=${r.status}`);
      console.log(`Judul  : ${r.judul}`);
      console.log(`Uraian : ${(r.uraian || "").slice(0, 200)}${(r.uraian || "").length > 200 ? "..." : ""}`);
      console.log(`Jejak kata kunci sentimen: ${jejak.length ? jejak.join(", ") : "(tidak ada kata kunci ketemu -- default Netral)"}`);
    });
  }

  console.log(`\n${"=".repeat(90)}`);
  console.log("Selesai. Baca tiap baris, tandain (di kepala/kertas) mana yang menurutmu SALAH");
  console.log("label sentimen/sektor-nya, terus laporin id-nya + menurutmu harusnya apa.");
  console.log("=".repeat(90) + "\n");

  process.exit(0);
})();