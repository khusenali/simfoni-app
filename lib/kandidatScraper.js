// lib/kandidatScraper.js
// Cari kandidat berita ekonomi Raja Ampat dari sumber DI LUAR 3 portal resmi
// yang sudah otomatis di-scrape (lib/newsScraper.js: RRI, Raja Ampat News,
// Wahana News). Pakai RSS pencarian Google News -- gratis, gak perlu API
// key, dan cakupan medianya jauh lebih luas buat media regional Indonesia
// dibanding NewsAPI.org.
//
// PENTING: hasil dari sini TIDAK PERNAH langsung jadi fenomena. Cuma masuk
// ke tabel kandidat_berita (status "Menunggu"). Tim Neraca yang approve/
// reject satu-satu di halaman /kandidat.
const Parser = require("rss-parser");
const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
  customFields: { item: ["source"] },
});
const { db } = require("./db");
const { scoreRajaAmpatRelevance } = require("./textmining");
const { classifyEconomicSector } = require("./kbliClassifier");

const EXCLUDED_SOURCE_NAMES = ["Raja Ampat News", "RRI", "RRI.co.id", "Wahana News", "Wahananews.co", "wahananews.co"];
const COOLDOWN_MINUTES = 2; // nyegah klik ganda gak sengaja

// Waktu generate terakhir -- dipakai juga buat ditampilkan di halaman
// /kandidat ("Terakhir dicari: ..."), bukan cuma buat cooldown internal.
async function getLastScanTime() {
  const last = await db.prepare("SELECT dipanggil_pada FROM gemini_usage_log ORDER BY id DESC LIMIT 1").get();
  return last?.dipanggil_pada || null;
}

async function checkCooldownAndLog(lastScanTime) {
  if (lastScanTime) {
    const diffMin = (Date.now() - new Date(lastScanTime).getTime()) / 60000;
    if (diffMin < COOLDOWN_MINUTES) {
      throw new Error(`Tunggu ${Math.ceil(COOLDOWN_MINUTES - diffMin)} menit lagi sebelum mencari ulang.`);
    }
  }
  await db.prepare("INSERT INTO gemini_usage_log (dipanggil_pada) VALUES (datetime('now'))").run();
}

function stripHtml(html) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Judul dari Google News RSS formatnya konsisten "Judul Asli - Nama Media".
// Kalau tag <source> gak ada/kosong, pecah dari judul sebagai fallback.
function splitTitleSource(rawTitle, sourceTag) {
  if (sourceTag) {
    const idx = rawTitle.lastIndexOf(` - ${sourceTag}`);
    if (idx !== -1) return { title: rawTitle.slice(0, idx).trim(), source: sourceTag };
    return { title: rawTitle, source: sourceTag };
  }
  const idx = rawTitle.lastIndexOf(" - ");
  if (idx === -1) return { title: rawTitle, source: null };
  return { title: rawTitle.slice(0, idx).trim(), source: rawTitle.slice(idx + 3).trim() };
}

function isExcludedSource(sourceName) {
  if (!sourceName) return false;
  const lower = sourceName.toLowerCase();
  return EXCLUDED_SOURCE_NAMES.some((s) => lower.includes(s.toLowerCase()));
}

function isLikelyRelevant(title) {
  return title.toLowerCase().includes("raja ampat");
}

async function callGoogleNews() {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent("Raja Ampat")}&hl=id&gl=ID&ceid=ID:id`;
  const parsed = await parser.parseURL(url);
  return parsed.items || [];
}

async function findKandidatByUrl(url) {
  return await db.prepare("SELECT id FROM kandidat_berita WHERE url = ?").get(url);
}

// Cari kandidat baru via Google News, simpan ke tabel kandidat_berita.
// Dipanggil dari tombol manual "Cari Berita Baru" di halaman /kandidat.
// Hanya artikel yang LEBIH BARU dari waktu generate sebelumnya yang
// diproses -- generate pertama kali (belum ada riwayat) ambil semua.
async function scanKandidatBerita() {
  const lastScanTime = await getLastScanTime();
  await checkCooldownAndLog(lastScanTime);

  const items = await callGoogleNews();
  const result = { ditemukan: items.length, baru: 0, dilewati: 0, diluarRentangWaktu: 0 };

  for (const item of items) {
    const rawTitle = String(item.title || "").trim();
    const url = String(item.link || "").trim();
    if (!rawTitle || !url) { result.dilewati++; continue; }

    const { title, source } = splitTitleSource(rawTitle, item.source);
    const tanggal = item.isoDate || item.pubDate || null;

    if (isExcludedSource(source)) { result.dilewati++; continue; }
    if (!isLikelyRelevant(title)) { result.dilewati++; continue; }

    // Cuma proses artikel yang tanggalnya SETELAH generate terakhir --
    // kalau ini generate pertama kali (lastScanTime null), ambil semua.
    if (lastScanTime && tanggal && new Date(tanggal) <= new Date(lastScanTime)) {
      result.diluarRentangWaktu++;
      continue;
    }

    // CATATAN: link dari Google News adalah URL redirect (news.google.com/...),
    // bukan URL akhir situs aslinya -- tapi tetap bisa diklik & sampai ke
    // artikel asli lewat "Buka sumber asli".
    const existing = await findKandidatByUrl(url);
    if (existing) { result.dilewati++; continue; }

    const ringkasan = stripHtml(item.contentSnippet || item.content).slice(0, 500) || null;

    // Klasifikasi sektor + skor relevansi dihitung DI MUKA (saat scan),
    // bukan nunggu sampai di-approve -- supaya Tim Neraca bisa langsung
    // lihat & filter di halaman /kandidat sebelum memutuskan.
    let sektorId = null;
    let sektorNama = null;
    let skorRelevansi = null;
    let labelRelevansi = null;
    try {
      const classification = await classifyEconomicSector({ judul: title, uraian: ringkasan || "" });
      sektorId = classification.sektorId || null;
      sektorNama = classification.sektor || null;
      const relevansi = scoreRajaAmpatRelevance(title, ringkasan);
      skorRelevansi = relevansi.score;
      labelRelevansi = relevansi.label;
    } catch (classifyErr) {
      // Klasifikasi gagal -> tetap simpan kandidatnya, cuma tanpa label.
      // Jangan sampai 1 artikel bermasalah menggagalkan seluruh scan.
      console.warn("Gagal klasifikasi kandidat saat scan:", classifyErr.message);
    }

    try {
      await db.prepare(`
        INSERT INTO kandidat_berita (judul, ringkasan, url, tanggal, sumber_disebutkan, sektor_id, sektor_nama, skor_relevansi, label_relevansi)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        title,
        ringkasan,
        url,
        tanggal,
        source,
        sektorId,
        sektorNama,
        skorRelevansi,
        labelRelevansi
      );
      result.baru++;
    } catch (err) {
      if (err.code === "SQLITE_CONSTRAINT") { result.dilewati++; continue; }
      throw err;
    }
  }

  return result;
}

module.exports = { scanKandidatBerita, getLastScanTime };