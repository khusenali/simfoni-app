// lib/rriTagScraper.js
// Backfill RRI lewat halaman tag topik (mis. rri.co.id/sorong/tags/raja-ampat-2026)
// — jauh lebih tepat sasaran dibanding menyisir sitemap nasional yang isinya
// campur seluruh Indonesia, karena RRI sendiri yang sudah menandai artikel
// mana yang tentang Raja Ampat.

const { extractKeywords, analyzeSentiment, isRajaAmpatRelated } = require("./textmining");
const { classifyEconomicSector } = require("./kbliClassifier");
const { detectDistrik } = require("./wilayah");
const { insertFenomenaWithSimilarity, findByUrl, cleanupIrrelevantForSumber } = require("./fenomenaRepo");
const { DISTRIK_MAP } = require("./wilayah");
const { extractArticleBody } = require("./articleBodyExtractor");

const BULAN_ID = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, jun: 6,
  jul: 7, agt: 8, sep: 9, okt: 10, nov: 11, des: 12,
};

function decodeEntities(str) {
  return (str || "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "SIMFONI-BPS-RajaAmpat/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} saat mengambil ${url}`);
  return res.text();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ambil semua URL artikel unik dari satu halaman tag (regex ini tidak
// bergantung pada struktur markup pasti, cukup pola URL artikel RRI:
// domain/wilayah/kategori/angka-id/slug-judul).
function extractArticleUrls(html) {
  const regex = /<a[^>]+href="(https:\/\/rri\.co\.id\/[a-z0-9-]+\/[a-z0-9-]+\/\d+\/[a-z0-9-]+)"[^>]*>([^<]+)<\/a>/gi;
  const seen = new Map();
  let m;
  while ((m = regex.exec(html)) !== null) {
    const url = m[1];
    const text = m[2].trim();
    if (text && !seen.has(url)) seen.set(url, text);
  }
  return [...seen.keys()];
}

function extractMetaContent(html, property) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, "i");
  const match = html.match(re);
  return match ? decodeEntities(match[1]) : null;
}

// Tanggal RRI tidak ada di meta tag, tapi muncul di badan halaman dengan
// format "DD Mmm YYYY HH:MM WIB", mis. "03 Agt 2026 07:25 WIB".
function extractTanggalFromBody(html) {
  const re = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agt|Sep|Okt|Nov|Des)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*WIB/i;
  const m = html.match(re);
  if (!m) return null;
  const [, day, bulanStr, year, hour, minute] = m;
  const bulan = BULAN_ID[bulanStr.toLowerCase()];
  if (!bulan) return null;
  // WIB = UTC+7, dikonversi ke UTC untuk disimpan konsisten dengan sumber lain.
  const utcHour = parseInt(hour, 10) - 7;
  return new Date(Date.UTC(parseInt(year, 10), bulan - 1, parseInt(day, 10), utcHour, parseInt(minute, 10))).toISOString();
}

async function fetchArticleDetail(url) {
  const html = await fetchText(url);
  const body = extractArticleBody(html);
  return {
    title: extractMetaContent(html, "og:title"),
    description: body || extractMetaContent(html, "og:description"),
    tanggal: extractTanggalFromBody(html),
  };
}

// Ambil satu halaman tag (dengan percobaan paginasi ?page=N) sampai tidak
// ada URL baru lagi, atau mentok maxPages.
async function fetchAllTagUrls(baseTagUrl, { maxPages = 15, delayMs = 300 } = {}) {
  const allUrls = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? baseTagUrl : `${baseTagUrl}?page=${page}`;
    let html;
    try {
      html = await fetchText(url);
    } catch {
      break; // halaman tidak ada / error -> anggap sudah habis
    }

    const urls = extractArticleUrls(html);
    const sebelumnya = allUrls.size;
    urls.forEach((u) => allUrls.add(u));

    if (allUrls.size === sebelumnya) break; // tidak ada URL baru -> sudah mentok
    await sleep(delayMs);
  }

  return [...allUrls];
}

// Backfill dari beberapa kombinasi wilayah+tag sekaligus, mis.:
// backfillFromTags([
//   { region: "sorong", tag: "raja-ampat-2026" },
//   { region: "sorong", tag: "raja-ampat-2025" },
// ])
async function backfillFromTags(tagConfigs, { delayMs = 400, onlyRelevant = true } = {}) {
  const results = { totalUrlDicek: 0, inserted: 0, skipped: 0, dihapusOtomatis: 0, errors: [] };
  const namaSumber = "RRI";

  for (const { region, tag } of tagConfigs) {
    const tagUrl = `https://rri.co.id/${region}/tags/${tag}`;
    console.log(`Mengambil daftar artikel dari: ${tagUrl}`);

    let urls;
    try {
      urls = await fetchAllTagUrls(tagUrl);
      console.log(`  Ditemukan ${urls.length} artikel untuk tag "${tag}".`);
    } catch (err) {
      results.errors.push({ tag, message: err.message });
      continue;
    }

    for (const url of urls) {
      results.totalUrlDicek++;
      if (findByUrl(url)) { results.skipped++; continue; }

      try {
        await sleep(delayMs);
        const meta = await fetchArticleDetail(url);
        if (!meta.title) { results.skipped++; continue; }

        const fullText = `${meta.title} ${meta.description || ""}`;
        if (onlyRelevant && !isRajaAmpatRelated(meta.title, meta.description)) { results.skipped++; continue; }

        const tanggal = meta.tanggal || new Date().toISOString();
        const distrik = detectDistrik(fullText);

        const classification = classifyEconomicSector(fullText);

        insertFenomenaWithSimilarity({
          tanggal,
          judul: meta.title,
          uraian: (meta.description || "").slice(0, 800),
          sumber_tipe: "portal_berita",
          nama_sumber: namaSumber,
          url,
          lokasi: distrik,
          distrik_nama: distrik,
          sektor_nama: classification.sektor,
          classification,
          keyword: extractKeywords(fullText),
          sentimen: analyzeSentiment(fullText),
          status: "Draft",
          media: "Teks",
        });
        results.inserted++;
        console.log(`  -> DISIMPAN: ${meta.title}`);
      } catch (err) {
        results.errors.push({ tahap: `artikel: ${url}`, message: err.message });
      }
    }
  }

  const cleanup = cleanupIrrelevantForSumber(namaSumber);
  results.dihapusOtomatis = cleanup.deleted;

  return results;
}

// Ubah nama kecamatan jadi format slug tag RRI, mis. "SALAWATI UTARA" -> "salawati-utara".
// "KOTA WAISAI" dikecualikan jadi "waisai" saja (sudah dikonfirmasi itu yang benar-benar ada).
function distrikToTagSlug(namaDistrik) {
  if (namaDistrik === "KOTA WAISAI") return "waisai";
  return namaDistrik.toLowerCase().replace(/\s+/g, "-");
}

// Bangun daftar tag dari SEMUA kecamatan yang terdaftar di wilayah.js, supaya
// otomatis ikut ter-update kalau daftar kecamatan berubah nanti.
function buildDistrikTagConfigs(region = "sorong") {
  return Object.keys(DISTRIK_MAP).map((distrik) => ({
    region,
    tag: distrikToTagSlug(distrik),
  }));
}

module.exports = { backfillFromTags, extractArticleUrls, fetchAllTagUrls, distrikToTagSlug, buildDistrikTagConfigs, fetchArticleDetail, extractTanggalFromBody };