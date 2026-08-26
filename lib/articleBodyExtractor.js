// lib/articleBodyExtractor.js
// Ambil beberapa paragraf isi artikel (bukan cuma judul/meta description
// yang seringnya cuma 1 kalimat pendek) -- biar deteksi distrik/sektor
// nyampe ke info yang baru muncul di paragraf kedua, ketiga, dst.

const cheerio = require("cheerio");

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "SIMFONI-BPS-RajaAmpat/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} saat mengambil ${url}`);
  return res.text();
}

// Kandidat kontainer isi artikel, diurutin dari yang paling spesifik.
// Beda portal berita biasanya beda struktur CMS/tema-nya.
const CONTENT_SELECTORS = [
  ".entry-content",
  ".post-content",
  ".single-content",
  ".td-post-content",
  ".detail-text",
  "article .content",
  "article",
];

function extractArticleBody(html, { maxParagraphs = 8, minLength = 30 } = {}) {
  const $ = cheerio.load(html);

  for (const selector of CONTENT_SELECTORS) {
    const container = $(selector).first();
    if (!container.length) continue;

    const paragraphs = container
      .find("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t) => t.length > minLength); // buang paragraf pendek (caption, iklan, dsb)

    if (paragraphs.length) {
      return paragraphs.slice(0, maxParagraphs).join(" ");
    }
  }

  // Fallback: kontainer spesifik gak ketemu -- ambil semua <p> di halaman.
  const allParagraphs = $("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > minLength);

  return allParagraphs.slice(0, maxParagraphs).join(" ");
}

module.exports = { fetchText, extractArticleBody };