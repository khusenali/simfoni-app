const { extractKeywords, analyzeSentiment, isRajaAmpatRelated } = require("./textmining");
const { classifyEconomicSector } = require("./kbliClassifier");
const { detectDistrik } = require("./wilayah");
const { insertFenomenaWithSimilarity, findByUrl, cleanupIrrelevantForSumber } = require("./fenomenaRepo");
const { extractArticleBody } = require("./articleBodyExtractor");

const NAMA_SUMBER = "Wahana News";
const KATEGORI_IDS = [183]; // Utama. Tambahkan ID lain di sini kalau sudah ketemu.

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

function extractMetaContent(html, property) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, "i");
  const match = html.match(re);
  return match ? decodeEntities(match[1]) : null;
}

function pad(n) { return String(n).padStart(2, "0"); }

function formatTanggalUrl(date) {
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function extractArticleUrls(html) {
  // Kode acak di akhir slug campuran huruf besar-kecil, mis. "...raja-ampat-6lbU4SvqX5"
  const regex = /https:\/\/papua-barat\.wahananews\.co\/(?:utama|nusantara|khas|serba-serbi|opini)\/[a-zA-Z0-9-]+/g;
  return [...new Set(html.match(regex) || [])];
}

async function fetchArticleDetail(url) {
  const html = await fetchText(url);
  const body = extractArticleBody(html);
  return {
    title: extractMetaContent(html, "og:title"),
    description: body || extractMetaContent(html, "og:description"),
  };
}

function* dateRange(fromDate, toDate) {
  const cur = new Date(fromDate);
  while (cur <= toDate) {
    yield new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
}

async function backfillFromArsip(fromDate, toDate, { delayMs = 400, onlyRelevant = true } = {}) {
  const results = { hariDicek: 0, totalUrlDicek: 0, inserted: 0, skipped: 0, dihapusOtomatis: 0, errors: [] };

  for (const day of dateRange(fromDate, toDate)) {
    results.hariDicek++;
    const tanggalStr = formatTanggalUrl(day);

    for (const kategoriId of KATEGORI_IDS) {
      const listUrl = `https://papua-barat.wahananews.co/arsip?tanggal=${tanggalStr}&kategori=${kategoriId}`;
      let html;
      try {
        html = await fetchText(listUrl);
      } catch (err) {
        results.errors.push({ tahap: `arsip ${tanggalStr}`, message: err.message });
        continue;
      }

      const urls = extractArticleUrls(html);
      if (urls.length) {
        console.log(`  [${tanggalStr}] ${urls.length} artikel ditemukan.`);
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

          const distrik = detectDistrik(fullText);
          // Tanggal presisi harian (dari parameter arsip), jam disamakan tengah
          // hari WIB (UTC+7) karena halaman artikel tidak menyediakan jam pasti.
          const tanggal = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 5, 0)).toISOString();

          const classification = classifyEconomicSector(fullText);

          insertFenomenaWithSimilarity({
            tanggal,
            judul: meta.title,
            uraian: (meta.description || "").slice(0, 800),
            sumber_tipe: "portal_berita",
            nama_sumber: NAMA_SUMBER,
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
          console.log(`    -> DISIMPAN: ${meta.title}`);
        } catch (err) {
          results.errors.push({ tahap: `artikel: ${url}`, message: err.message });
        }
      }
    }

    await sleep(150); // jeda kecil antar hari, tambahan dari jeda antar artikel
  }

  const cleanup = cleanupIrrelevantForSumber(NAMA_SUMBER);
  results.dihapusOtomatis = cleanup.deleted;

  return results;
}

module.exports = { backfillFromArsip, extractArticleUrls };