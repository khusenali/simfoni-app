// lib/statsRepo.js
// Kumpulan query agregasi yang memasok kartu & grafik di halaman Dashboard.
const { db } = require("./db");

function getTotals({ dateFrom, dateTo } = {}) {
  const where = [];
  const params = [];
  if (dateFrom) { where.push("tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = db.prepare(`SELECT COUNT(*) c FROM fenomena ${whereSql}`).get(...params).c;
  const byStatus = db.prepare(`SELECT status, COUNT(*) c FROM fenomena ${whereSql} GROUP BY status`).all(...params);
  const map = { Draft: 0, Terverifikasi: 0 };
  byStatus.forEach((r) => (map[r.status] = r.c));
  return { total, ...map };
}

function getSentimenSummary({ dateFrom, dateTo } = {}) {
  const where = [];
  const params = [];
  if (dateFrom) { where.push("tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = db.prepare(`SELECT COUNT(*) c FROM fenomena ${whereSql}`).get(...params).c;
  const safeDivisor = total || 1; // cuma buat cegah bagi nol saat hitung persentase
   const rows = db.prepare(`SELECT sentimen, COUNT(*) c FROM fenomena ${whereSql} GROUP BY sentimen`).all(...params);
  const result = { Positif: 0, Netral: 0, Negatif: 0 };
  rows.forEach((r) => { if (r.sentimen) result[r.sentimen] = r.c; });
  return {
    total, // angka ASLI (boleh 0), gak dipalsuin lagi jadi 1
    positif: result.Positif, netral: result.Netral, negatif: result.Negatif,
    positifPct: Math.round((result.Positif / safeDivisor) * 100),
    netralPct: Math.round((result.Netral / safeDivisor) * 100),
    negatifPct: Math.round((result.Negatif / safeDivisor) * 100),
  };
}

// Untuk grafik "Fenomena per Bulan" (stacked bar: Draft/Terverifikasi)
function getFenomenaPerBulan(months = 9) {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', tanggal, '+9 hours') ym, status, COUNT(*) c
    FROM fenomena
    GROUP BY ym, status
    ORDER BY ym
  `).all();

  const byMonth = {};
  rows.forEach((r) => {
    if (!byMonth[r.ym]) byMonth[r.ym] = { Draft: 0, Terverifikasi: 0 };
    byMonth[r.ym][r.status] = r.c;
  });

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-months)
    .map(([ym, v]) => ({ bulan: ym, ...v }));
}

// Untuk grafik "Tren Sentimen" (line chart persentase positif per bulan)
function getTrenSentimen(months = 9, { sektor, dateFrom, dateTo } = {}) {
  const where = [];
  const params = [];
  if (sektor) { where.push("s.nama = ?"); params.push(sektor); }
  if (dateFrom) { where.push("f.tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("f.tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = db.prepare(`
    SELECT strftime('%Y-%m', f.tanggal, '+9 hours') ym, f.sentimen, COUNT(*) c
    FROM fenomena f
    LEFT JOIN sektor s ON f.sektor_id = s.id
    ${whereSql}
    GROUP BY ym, f.sentimen
    ORDER BY ym
  `).all(...params);

  const byMonth = {};
  rows.forEach((r) => {
    if (!byMonth[r.ym]) byMonth[r.ym] = { Positif: 0, Netral: 0, Negatif: 0 };
    byMonth[r.ym][r.sentimen] = r.c;
  });

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-months)
    .map(([ym, v]) => {
      const total = v.Positif + v.Netral + v.Negatif || 1;
      return {
        bulan: ym,
        positifPct: Math.round((v.Positif / total) * 100),
        netralPct: Math.round((v.Netral / total) * 100),
        negatifPct: Math.round((v.Negatif / total) * 100),
        total,
      };
    });
}

function getTopSektor(limit = 5, { dateFrom, dateTo } = {}) {
  const where = [];
  const params = [];
  if (dateFrom) { where.push("f.tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("f.tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `AND ${where.join(" AND ")}` : "";

  const total = db.prepare(`SELECT COUNT(*) c FROM fenomena f WHERE f.sektor_id IS NOT NULL ${whereSql}`).get(...params).c || 1;
  const rows = db.prepare(`
    SELECT s.nama, COUNT(*) c
    FROM fenomena f JOIN sektor s ON f.sektor_id = s.id
    WHERE 1=1 ${whereSql}
    GROUP BY s.nama
    ORDER BY c DESC
    LIMIT ?
  `).all(...params, limit);
  return rows.map((r) => ({ nama: r.nama, jumlah: r.c, pct: Math.round((r.c / total) * 100) }));
}

function getSumberSummary({ dateFrom, dateTo, maxSlices = 8 } = {}) {
  const where = [];
  const params = [];
  if (dateFrom) { where.push("tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = db.prepare(`
    SELECT COALESCE(NULLIF(TRIM(nama_sumber), ''), 'Tidak diketahui') nama, COUNT(*) c
    FROM fenomena ${whereSql}
    GROUP BY nama ORDER BY c DESC
  `).all(...params);

  // "Import Excel" & "Input Manual" sama-sama data hasil kerja lapangan Tim
  // Neraca (bukan hasil scraping otomatis) -- digabung jadi satu label
  // "Data Lapangan" KHUSUS untuk chart Sebaran Sumber Data ini. Nama sumber
  // asli di daftar/detail fenomena TIDAK berubah, tetap bisa dibedakan.
  const GABUNG_JADI_DATA_LAPANGAN = ["Import Excel", "Input Manual"];
  const merged = {};
  for (const r of rows) {
    const label = GABUNG_JADI_DATA_LAPANGAN.includes(r.nama) ? "Data Lapangan" : r.nama;
    merged[label] = (merged[label] || 0) + r.c;
  }
  const mergedRows = Object.entries(merged)
    .map(([nama, c]) => ({ nama, c }))
    .sort((a, b) => b.c - a.c);

  const total = mergedRows.reduce((sum, r) => sum + r.c, 0);
  let sumber = mergedRows.map((r) => ({ nama: r.nama, jumlah: r.c }));
  if (sumber.length > maxSlices) {
    const top = sumber.slice(0, maxSlices - 1);
    const sisa = sumber.slice(maxSlices - 1).reduce((sum, r) => sum + r.jumlah, 0);
    sumber = [...top, { nama: "Lainnya", jumlah: sisa }];
  }
  return { total, sumber };
}

function getSebaranDistrik({ dateFrom, dateTo } = {}) {
  const where = [];
  const params = [];
  if (dateFrom) { where.push("f.tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("f.tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `AND ${where.join(" AND ")}` : "";

  return db.prepare(`
    SELECT d.nama, COUNT(*) c
    FROM fenomena f JOIN distrik d ON f.distrik_id = d.id
    WHERE 1=1 ${whereSql}
    GROUP BY d.nama
    ORDER BY c DESC
  `).all(...params).map((r) => ({ nama: r.nama, jumlah: r.c }));
}

function getKondisiEkonomi({ dateFrom, dateTo, prevDateFrom, prevDateTo } = {}) {
  const s = getSentimenSummary({ dateFrom, dateTo });
  const label = s.total === 0 ? "Tidak ada data" : s.positifPct >= 50 ? "Tumbuh" : s.positifPct >= 35 ? "Stagnan" : "Kontraksi"

  let delta = 0;
  if (prevDateFrom && prevDateTo) {
    // Ada periode pembanding spesifik (triwulan/tahun sebelumnya) -> selisih
    // langsung dari persentase sentimen positif kedua periode. Kalau periode
    // sebelumnya kosong (mis. sudah diarsip/dihapus retensi), delta tetap 0
    // -- gak ada dasar buat dibandingkan.
    const prev = getSentimenSummary({ dateFrom: prevDateFrom, dateTo: prevDateTo });
    if (prev.total > 0) delta = s.positifPct - prev.positifPct;
  } 
  // "Semua Data" (prevDateFrom/prevDateTo kosong) -> gak ada konsep "periode
  // sebelumnya" yang jelas buat mode ini, jadi delta selalu 0 (gak dibandingkan
  // sama sekali), bukan pakai perkiraan tren 2 bulan kayak sebelumnya.

  return { label, positifPct: s.positifPct, delta, total: s.total };
}

const PERIOD_FORMAT = { minggu: "%Y-%W", bulan: "%Y-%m", tahun: "%Y" };

function getFenomenaPerPeriode(granularity = "bulan", count = 9, { dateFrom, dateTo } = {}) {
  const fmt = PERIOD_FORMAT[granularity] || PERIOD_FORMAT.bulan;
  const where = [];
  const params = [];
  if (dateFrom) { where.push("tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("tanggal <= ?"); params.push(dateTo); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = db.prepare(`
    SELECT strftime('${fmt}', tanggal, '+9 hours') periode, status, COUNT(*) c
    FROM fenomena
    ${whereSql}
    GROUP BY periode, status
    ORDER BY periode
  `).all(...params);

  const byPeriode = {};
  rows.forEach((r) => {
    if (!byPeriode[r.periode]) byPeriode[r.periode] = { Draft: 0, Terverifikasi: 0 };
    byPeriode[r.periode][r.status] = r.c;
  });

  return Object.entries(byPeriode)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-count)
    .map(([periode, v]) => ({ periode, ...v }));
}

function getKondisiTerverifikasi({ dateFrom, dateTo } = {}) {
  const where = ["f.status = 'Terverifikasi'"];
  const params = [];
  if (dateFrom) { where.push("f.tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("f.tanggal <= ?"); params.push(dateTo); }
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const total = db.prepare(`SELECT COUNT(*) c FROM fenomena f ${whereSql}`).get(...params).c;
  if (!total) {
    return { total: 0, positifPct: 0, netralPct: 0, negatifPct: 0, label: null, sektorUtama: null };
  }

  const rows = db.prepare(`SELECT f.sentimen, COUNT(*) c FROM fenomena f ${whereSql} GROUP BY f.sentimen`).all(...params);
  const result = { Positif: 0, Netral: 0, Negatif: 0 };
  rows.forEach((r) => { if (r.sentimen) result[r.sentimen] = r.c; });

  const positifPct = Math.round((result.Positif / total) * 100);
  const netralPct = Math.round((result.Netral / total) * 100);
  const negatifPct = Math.round((result.Negatif / total) * 100);
  const label = positifPct >= 50 ? "Membaik" : positifPct >= 35 ? "Stabil" : "Melemah";

  const sektorRow = db.prepare(`
    SELECT s.nama, COUNT(*) c
    FROM fenomena f JOIN sektor s ON f.sektor_id = s.id
    ${whereSql}
    GROUP BY s.nama ORDER BY c DESC LIMIT 1
  `).get(...params);

  return { total, positifPct, netralPct, negatifPct, label, sektorUtama: sektorRow?.nama || null };
}

function getKeywordCloud({ dateFrom, dateTo, limit = 40 } = {}) {
  const where = ["keyword IS NOT NULL"];
  const params = [];
  if (dateFrom) { where.push("tanggal >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("tanggal <= ?"); params.push(dateTo); }
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const rows = db.prepare(`SELECT keyword FROM fenomena ${whereSql}`).all(...params);

  const freq = {};
  rows.forEach((r) => {
    let words;
    try {
      words = JSON.parse(r.keyword);
    } catch {
      return; // lewati baris dengan JSON keyword yang rusak/kosong
    }
    if (!Array.isArray(words)) return;
    words.forEach((w) => {
      const key = String(w).trim().toLowerCase();
      if (!key) return;
      freq[key] = (freq[key] || 0) + 1;
    });
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([text, value]) => ({ text, value }));
}

module.exports = {
  getTotals, getSentimenSummary, getFenomenaPerBulan, getTrenSentimen,
  getTopSektor, getSumberSummary, getSebaranDistrik, getKondisiEkonomi, getFenomenaPerPeriode, getKondisiTerverifikasi, getKeywordCloud
};
