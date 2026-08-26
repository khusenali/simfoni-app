// lib/newsScraper.js
// Pengambilan data otomatis dari portal berita.
//
// Kenapa RSS, bukan HTML scraping mentah?
// - Gratis, resmi disediakan tiap portal berita, dan jauh lebih stabil
//   daripada scraping HTML (yang gampang rusak saat portal ganti struktur).
// - RSS juga menyertakan waktu publikasi lengkap (tanggal + jam), sesuai
//   kebutuhan pencatatan waktu kejadian/publikasi fenomena.

const Parser = require("rss-parser");
const parser = new Parser({ timeout: 15000 });
const { extractKeywords, analyzeSentiment, isRajaAmpatRelated, isExcludedContent } = require("./textmining");
const { classifyEconomicSector } = require("./kbliClassifier");
const { detectDistrik } = require("./wilayah");
const { insertFenomenaWithSimilarity, findByUrl, getLatestTanggalForSumber, cleanupIrrelevantForSumber } = require("./fenomenaRepo");
const { fetchArticleDetail } = require("./wahanaArsipScraper"); // reuse fetcher halaman penuh
const { fetchText, extractArticleBody } = require("./articleBodyExtractor");

// Feed RSS resmi portal berita nasional & lokal Papua Barat. Feed nasional
// tetap disertakan karena sesekali memuat liputan khusus Raja Ampat; filter
// lokalitas di bawah yang memastikan hanya berita Raja Ampat yang disimpan.
const NEWS_FEEDS = [
  { nama: "RRI", url: "https://rri.co.id/rss" },
  { nama: "Raja Ampat News", url: "https://rajaampatnews.com/feed/" },
  { nama: "Wahana News", url: "https://papua-barat.wahananews.co/rss" },
];

// WordPress (termasuk rajaampatnews.com) secara default menyediakan RSS per
// bulan lewat URL arsip: https://domain.com/YYYY/MM/feed/ — dipakai untuk
// mengambil data LAMA (backfill), bukan cuma berita terbaru seperti
// NEWS_FEEDS di atas.
const ARCHIVE_FEEDS = [
  { nama: "Raja Ampat News", baseUrl: "https://rajaampatnews.com" },
];

function buildArchiveUrl(baseUrl, year, month) {
  const mm = String(month).padStart(2, "0");
  return `${baseUrl}/${year}/${mm}/feed/`;
}

const TITLE_SUFFIXES_TO_STRIP = {
  "RRI": [" - RRI.co.id", "- RRI.co.id"],
};

function cleanTitle(title, namaSumber) {
  let t = (title || "").trim();
  const suffixes = TITLE_SUFFIXES_TO_STRIP[namaSumber];
  if (suffixes) {
    for (const suf of suffixes) {
      if (t.endsWith(suf)) {
        t = t.slice(0, -suf.length).trim();
        break;
      }
    }
  }
  return t;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ingestFeedItems(parsed, namaSumber, { onlyRelevant = true, sejakTanggal = null } = {}) {
  const result = { inserted: 0, skipped: 0, mirip: 0 };

  for (const item of parsed.items) {
    const title = cleanTitle(item.title || "", namaSumber);
    let content = item.contentSnippet || item.content || "";
    const url = item.link || "";

    if (!url) continue;
    if (isExcludedContent(title)) {
      result.skipped++;
      continue;
    }
    let tanggal = item.isoDate;
    if (!tanggal && item.pubDate) {
      const parsed = new Date(item.pubDate);
      tanggal = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    }
    if (!tanggal) tanggal = new Date().toISOString();

    // Sync biasa (bukan backfill): lewati artikel yang tidak lebih baru dari
    // artikel terakhir yang sudah tersimpan dari sumber ini.
    if (sejakTanggal && tanggal <= sejakTanggal) {
      result.skipped++;
      continue;
    }

    if (onlyRelevant && !isRajaAmpatRelated(title, content)) {
      result.skipped++;
      continue;
    }
    if (findByUrl(url)) {
      result.skipped++;
      continue;
    }

    // RSS cuma ngasih cuplikan pendek -- ambil beberapa paragraf dari
    // halaman artikel aslinya biar nama distrik yang baru muncul di
    // paragraf ke-2/3 dst tetap kedeteksi. Gagal fetch (timeout dll)
    // tetap lanjut pakai cuplikan RSS seadanya, gak nge-block proses.
    try {
      const html = await fetchText(url);
      const body = extractArticleBody(html);
      if (body) content = body;
    } catch { /* fallback ke cuplikan RSS */ }
    await sleep(300); // jeda antar fetch artikel, jangan nembak beruntun

    const fullText = `${title} ${content}`;
    const distrik = detectDistrik(fullText);

    const classification = classifyEconomicSector(fullText);

    insertFenomenaWithSimilarity({
      tanggal,
      judul: title,
      uraian: content.slice(0, 800),
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
      penulis: item.creator || null,
      media: "Teks",
    });

    result.inserted++;
  }
  return result;
}

// Ambil berita TERBARU dari semua portal di NEWS_FEEDS (dipakai tombol
// "Sinkron Portal Berita" di halaman Fenomena).
async function scrapeAllNewsFeeds({ onlyRelevant = true } = {}) {
  const results = { inserted: 0, skipped: 0, mirip: 0, dihapusOtomatis: 0, errors: [] };

  for (const feed of NEWS_FEEDS) {
    try {
      const sejakTanggal = getLatestTanggalForSumber(feed.nama);
      const parsed = await parser.parseURL(feed.url);
      const r = await ingestFeedItems(parsed, feed.nama, { onlyRelevant, sejakTanggal });
      results.inserted += r.inserted;
      results.skipped += r.skipped;
      results.mirip += r.mirip;

      const cleanup = cleanupIrrelevantForSumber(feed.nama);
      results.dihapusOtomatis += cleanup.deleted;
    } catch (err) {
      results.errors.push({ feed: feed.nama, message: err.message });
    }
  }
  return results;
}

// Ambil berita ARSIP dari satu bulan tertentu (backfill data lama).
// Contoh: scrapeArchiveMonth({ nama: "Raja Ampat News", baseUrl: "https://rajaampatnews.com" }, 2025, 1)
async function scrapeArchiveMonth(feed, year, month, { onlyRelevant = true, maxPages = 30, maxRetries = 2 } = {}) {
  const result = { inserted: 0, skipped: 0, mirip: 0, errors: [], urls: [], catatan: [] };

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1
      ? buildArchiveUrl(feed.baseUrl, year, month)
      : `${buildArchiveUrl(feed.baseUrl, year, month)}?paged=${page}`;

    result.urls.push(url);

    let parsed = null;
    let lastErr = null;

    // Retry beberapa kali sebelum benar-benar menyerah — gangguan sesaat di
    // sisi WordPress (cache miss/timeout) cukup umum untuk endpoint arsip.
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        parsed = await parser.parseURL(url);
        break;
      } catch (err) {
        lastErr = err;
        parsed = null;
        if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }

    if (!parsed) {
      result.errors.push({ feed: feed.nama, page, message: lastErr?.message || "gagal setelah retry" });
      break;
    }

    if (!parsed.items || parsed.items.length === 0) break;

    const firstDate = new Date(parsed.items[0].isoDate || parsed.items[0].pubDate);
    const monthMismatch = firstDate.getUTCFullYear() !== year || firstDate.getUTCMonth() + 1 !== month;

    if (monthMismatch && page === 1) {
      // Kemungkinan besar cache/redirect WordPress nyasar ke feed lain saat
      // diminta khusus halaman pertama — coba retry sekali lagi dengan jeda
      // lebih lama sebelum benar-benar menyerah untuk bulan ini.
      let retried = false;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        try {
          const retryParsed = await parser.parseURL(url);
          const retryDate = new Date(retryParsed.items?.[0]?.isoDate || retryParsed.items?.[0]?.pubDate);
          if (retryParsed.items?.length && retryDate.getUTCFullYear() === year && retryDate.getUTCMonth() + 1 === month) {
            parsed = retryParsed;
            retried = true;
            break;
          }
        } catch { /* coba lagi di iterasi berikutnya */ }
      }
      if (!retried) {
        result.catatan.push(`Bulan ${year}-${String(month).padStart(2, "0")} dilewati: hasil halaman 1 tidak cocok bulan yang diminta (dapat tanggal ${firstDate.toISOString()}) setelah ${maxRetries} kali percobaan ulang.`);
        break;
      }
    } else if (monthMismatch) {
      break; // di halaman > 1, ini memang wajar tandanya sudah lewat bulan
    }

    const r = await ingestFeedItems(parsed, feed.nama, { onlyRelevant });
    result.inserted += r.inserted;
    result.skipped += r.skipped;
    result.mirip += r.mirip;

    if (parsed.items.length < 10) break;
  }

  return {
    url: result.urls[0], inserted: result.inserted, skipped: result.skipped,
    mirip: result.mirip, errors: result.errors, catatan: result.catatan,
  };
}

// Backfill banyak bulan sekaligus untuk satu portal, mis. Jan-Des 2025.
async function scrapeArchiveRange(feedNama, fromYear, fromMonth, toYear, toMonth, opts = {}) {
  const feed = ARCHIVE_FEEDS.find((f) => f.nama === feedNama);
  if (!feed) throw new Error(`Portal "${feedNama}" belum terdaftar di ARCHIVE_FEEDS.`);

  const results = { inserted: 0, skipped: 0, mirip: 0, errors: [], perBulan: [] };
  let y = fromYear, m = fromMonth;

  while (y < toYear || (y === toYear && m <= toMonth)) {
    const r = await scrapeArchiveMonth(feed, y, m, opts);
    results.inserted += r.inserted;
    results.skipped += r.skipped;
    results.mirip += r.mirip;
    results.errors.push(...r.errors);
    results.perBulan.push({ year: y, month: m, ...r });

    m++;
    if (m > 12) { m = 1; y++; }
  }

  const cleanup = cleanupIrrelevantForSumber(feedNama);
  results.dihapusOtomatis = cleanup.deleted;

  return results;
}

module.exports = {
  scrapeAllNewsFeeds, scrapeArchiveMonth, scrapeArchiveRange,
  NEWS_FEEDS, ARCHIVE_FEEDS,
};