import PDFDocument from "pdfkit";
import { listFenomena } from "../../../../lib/fenomenaRepo";
import { formatDateTime } from "../../../../lib/format";
import { buildExportFilename } from "../../../../lib/exportFilename";
const { SEMANTIC, PALETTE } = require("../../../../lib/theme");
const { LOGO_SIMFONI, LOGO_BPS, LOGO_SIMFONI_RATIO, LOGO_BPS_RATIO } = require("../../../../lib/logoAssets");

const INK = SEMANTIC.ink;
const TEAL = SEMANTIC.teal;
const GOLD = SEMANTIC.gold;
const CORAL = SEMANTIC.negative;
const NEUTRAL = SEMANTIC.neutral;
const PLUM = SEMANTIC.tealDark;
const SOFT = "#5B6B76";
const LINE = SEMANTIC.line;
const BG = SEMANTIC.bg;
const SUMBER_COLORS = PALETTE;

const PAGE_MARGIN = 40;
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2;
const MAX_PRINTED = 500; // batas jumlah baris yang benar-benar dicetak satu-per-satu di Section 2

function streamToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

function ensureSpace(doc, y, needed) {
  if (y + needed > 780) {
    doc.addPage();
    return PAGE_MARGIN;
  }
  return y;
}

// Header dipakai persis sama di Section 1 & Section 2, biar konsisten dan
// gak duplikat kode -- logo SIMFONI kiri, logo BPS kanan, sama kayak header
// di website aslinya.
function drawHeader(doc) {
  doc.rect(0, 0, 595.28, 6).fill(TEAL);
  const logoH = 28;
  const simfoniW = logoH * LOGO_SIMFONI_RATIO;
  const bpsW = logoH * LOGO_BPS_RATIO;
  const logoY = 18;
  doc.image(LOGO_SIMFONI, PAGE_MARGIN, logoY, { height: logoH });
  doc.image(LOGO_BPS, 595.28 - PAGE_MARGIN - bpsW, logoY, { height: logoH });
  return logoY + logoH + 14;
}

function sectionTitle(doc, text, y) {
  y = ensureSpace(doc, y, 30);
  doc.fontSize(12).fillColor(INK).font("Helvetica-Bold").text(text, PAGE_MARGIN, y);
  return y + 20;
}

// Menghitung SEMUA angka ringkasan langsung dari data yang sudah difilter
// (bukan query terpisah) -- supaya kartu & grafik di Section 1 dijamin selalu
// cocok dengan daftar berita di Section 2, apa pun filter yang dipilih.
function summarizeFromData(allData) {
  const totals = { total: allData.length, Draft: 0, Terverifikasi: 0 };
  const sentimenCount = { Positif: 0, Netral: 0, Negatif: 0 };
  const sektorCount = {};
  const sumberCount = {};

  for (const item of allData) {
    if (item.status === "Draft") totals.Draft++;
    else if (item.status === "Terverifikasi") totals.Terverifikasi++;

    if (item.sentimen && sentimenCount[item.sentimen] !== undefined) sentimenCount[item.sentimen]++;
    if (item.sektor) sektorCount[item.sektor] = (sektorCount[item.sektor] || 0) + 1;
    const sumberNama = item.namaSumber || "Tidak diketahui";
    sumberCount[sumberNama] = (sumberCount[sumberNama] || 0) + 1;
  }

  const topSektor = Object.entries(sektorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nama, jumlah]) => ({ nama, jumlah }));

  const sumberEntries = Object.entries(sumberCount).sort((a, b) => b[1] - a[1]);
  const sumberList = sumberEntries.slice(0, 7).map(([nama, jumlah]) => ({ nama, jumlah }));
  const sisaSumber = sumberEntries.slice(7).reduce((sum, [, v]) => sum + v, 0);
  if (sisaSumber > 0) sumberList.push({ nama: "Lainnya", jumlah: sisaSumber });

  const positifPct = totals.total > 0 ? Math.round((sentimenCount.Positif / totals.total) * 100) : 0;
  const label = positifPct >= 50 ? "Membaik" : positifPct >= 35 ? "Stabil" : "Melemah";

  return {
    totals,
    sentimenSummary: { positif: sentimenCount.Positif, netral: sentimenCount.Netral, negatif: sentimenCount.Negatif },
    kondisi: { label, positifPct },
    topSektor,
    sumberSummary: { sumber: sumberList },
  };
}

function drawSummaryCards(doc, { totals, kondisi }, y) {
  y = ensureSpace(doc, y, 90);
  const gap = 12;
  const cardWidth = (CONTENT_WIDTH - gap) / 2;
  const cardHeight = 78;

  const cards = [
    { label: "Total Fenomena", value: String(totals.total), color: INK, sub: `${totals.Draft} Tercatat · ${totals.Terverifikasi} Terverifikasi` },
    { label: "Kondisi Ekonomi", value: kondisi.label || "-", color: TEAL, sub: `${kondisi.positifPct}% sentimen positif` },
  ];

  cards.forEach((c, i) => {
    const x = PAGE_MARGIN + i * (cardWidth + gap);
    doc.roundedRect(x, y, cardWidth, cardHeight, 8).fill(c.color);
    doc.fontSize(8).fillColor("#FFFFFF").font("Helvetica").text(c.label, x + 14, y + 14, { width: cardWidth - 28 });
    doc.fontSize(20).fillColor("#FFFFFF").font("Helvetica-Bold").text(c.value, x + 14, y + 30, { width: cardWidth - 28 });
    doc.fontSize(7.5).fillColor("#FFFFFF").font("Helvetica").opacity(0.85).text(c.sub, x + 14, y + 58, { width: cardWidth - 28 });
    doc.opacity(1);
  });

  return y + cardHeight + 24;
}

// Bingkai kartu (border rounded, putih) di sekeliling SATU visualisasi --
// dipakai supaya tiap grafik (Distribusi Sentimen / Sumber Data / Sektor
// Teratas) terlihat sebagai kotak terpisah, satu per baris, persis pola
// ".card" di website, bukan nempel jadi satu blok panjang tanpa batas jelas.
// contentFn menerima (x, y, width) dan HARUS mengembalikan y akhir setelah
// menggambar isinya -- height kartu dihitung otomatis dari situ.
function drawCard(doc, y, estimatedHeight, contentFn) {
  const padding = 14;
  y = ensureSpace(doc, y, estimatedHeight + padding * 2 + 16);

  const cardTop = y;
  const contentX = PAGE_MARGIN + padding;
  const contentWidth = CONTENT_WIDTH - padding * 2;
  const afterY = contentFn(contentX, cardTop + padding, contentWidth);
  const cardHeight = (afterY - cardTop) + padding;

  // Border digambar SETELAH isinya (garis tepi doang, gak ada fill) --
  // gak nutupin konten, dan tinggi kartunya udah pasti akurat karena diambil
  // dari y hasil gambar isi yang sebenarnya, bukan tebak-tebakan di awal.
  doc.roundedRect(PAGE_MARGIN, cardTop, CONTENT_WIDTH, cardHeight, 8).stroke(LINE);

  return cardTop + cardHeight + 16;
}

function drawProportionBar(doc, title, segments, x, y, width) {
  doc.fontSize(10).fillColor(INK).font("Helvetica-Bold").text(title, x, y);
  y += 18;

  const barHeight = 16;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  let bx = x;

  segments.forEach((s) => {
    const w = (s.value / total) * width;
    if (w > 0) doc.rect(bx, y, w, barHeight).fill(s.color);
    bx += w;
  });
  doc.roundedRect(x, y, width, barHeight, 3).stroke(LINE);
  y += barHeight + 10;

  // Legend bisa lebih dari 1 baris kalau segmennya banyak (mis. daftar
  // sumber berita) -- dibungkus manual per baris biar gak kepotong di tepi
  // kartu, bukan cuma satu baris panjang kayak sebelumnya.
  let lx = x;
  let lineHeight = 12;
  doc.fontSize(8.5).font("Helvetica");
  segments.forEach((s) => {
    const pct = Math.round((s.value / total) * 100);
    const label = `${s.label} ${pct}% (${s.value})`;
    const labelWidth = doc.widthOfString(label) + 14;
    if (lx + labelWidth > x + width) { lx = x; y += lineHeight + 4; }
    doc.circle(lx + 4, y + 4, 4).fill(s.color);
    doc.fillColor(SOFT).text(label, lx + 14, y);
    lx += labelWidth + 20;
  });

  return y + lineHeight + 6;
}

function drawSektorBars(doc, topSektor, x, y, width) {
  if (!topSektor.length) return y;
  doc.fontSize(10).fillColor(INK).font("Helvetica-Bold").text("Sektor Ekonomi Teratas", x, y);
  y += 20;

  const maxVal = Math.max(...topSektor.map((s) => s.jumlah), 1);
  const labelWidth = 190;
  const barAreaWidth = width - labelWidth - 40;
  const colors = [TEAL, INK, GOLD, PLUM, CORAL];

  topSektor.forEach((s, i) => {
    doc.fontSize(8).fillColor(INK).font("Helvetica").text(s.nama, x, y + 3, { width: labelWidth, ellipsis: true });
    const barW = (s.jumlah / maxVal) * barAreaWidth;
    doc.roundedRect(x + labelWidth, y, Math.max(barW, 2), 14, 3).fill(colors[i % colors.length]);
    doc.fontSize(8.5).fillColor(INK).font("Helvetica-Bold").text(String(s.jumlah), x + labelWidth + barAreaWidth + 8, y + 3);
    y += 24;
  });

  return y;
}

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filters = {
    search: searchParams.get("search") || undefined,
    sektor: searchParams.get("sektor") || undefined,
    status: searchParams.get("status") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
  };
  // Label yang enak dibaca (bukan kode mentah) -- ini sudah dikirim
  // frontend (LaporanModal.jsx) buat bikin nama file, dipakai ulang di sini
  // buat keterangan filter di kop laporan.
  const sektorLabel = searchParams.get("sektorLabel") || "Semua Sektor";
  const statusLabel = searchParams.get("statusLabel") || "Semua Status";
  const periodeLabel = searchParams.get("periodeLabel") || "Semua Data";

  // Ambil SEMUA baris yang cocok filter (dipakai untuk hitung ringkasan yang
  // akurat), lalu baru batasi berapa yang benar-benar dicetak satu-per-satu
  // di Section 2 supaya laporan tidak jadi ribuan halaman.
  const { data: allData } = await listFenomena({ ...filters, limit: 5000, offset: 0 });
  const printedData = allData.slice(0, MAX_PRINTED);

  const { totals, sentimenSummary, kondisi, topSektor, sumberSummary } = summarizeFromData(allData);

  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4", bufferPages: true });
  const bufferPromise = streamToBuffer(doc);

  // ===== SECTION 1: Ringkasan Dashboard =====
  let y = drawHeader(doc);
  doc.fontSize(9).fillColor(SOFT).font("Helvetica")
    .text(`Laporan Fenomena Ekonomi · Dicetak ${formatDateTime(new Date().toISOString())}`, PAGE_MARGIN, y);
  y += 18;

  // Kotak kecil "keterangan filter" -- background lembut, kolom label lebar
  // tetap biar titik duanya sejajar rapi di semua baris, bukan mepet ke
  // panjang teks labelnya masing-masing.
  const filterPad = 10;
  const filterLineH = 13;
  const filterBoxH = filterLineH * 3 + filterPad * 2;
  doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, filterBoxH, 6).fill(BG);

  const labelColW = 54;
  function drawFilterLine(label, value, ly) {
    doc.fontSize(8.5).fillColor(INK).font("Helvetica-Bold").text(label, PAGE_MARGIN + filterPad, ly, { width: labelColW });
    doc.text(":", PAGE_MARGIN + filterPad + labelColW, ly);
    doc.font("Helvetica").fillColor(SOFT)
      .text(value, PAGE_MARGIN + filterPad + labelColW + 10, ly, { width: CONTENT_WIDTH - filterPad * 2 - labelColW - 10 });
  }

  let fy = y + filterPad;
  drawFilterLine("Sektor", sektorLabel, fy); fy += filterLineH;
  drawFilterLine("Status", statusLabel, fy); fy += filterLineH;
  drawFilterLine("Periode", periodeLabel, fy);

  y += filterBoxH + 20;

  doc.fontSize(13).fillColor(INK).font("Helvetica-Bold").text("Ringkasan Dashboard", PAGE_MARGIN, y);
  y += 22;
  y = drawSummaryCards(doc, { totals, kondisi }, y);

  y = sectionTitle(doc, "Ringkasan Visual", y - 6);

  y = drawCard(doc, y, 70, (x, cy, w) =>
    drawProportionBar(doc, "Distribusi Sentimen", [
      { label: "Positif", value: sentimenSummary.positif, color: TEAL },
      { label: "Netral", value: sentimenSummary.netral, color: NEUTRAL },
      { label: "Negatif", value: sentimenSummary.negatif, color: CORAL },
    ], x, cy, w)
  );

  y = drawCard(doc, y, 70, (x, cy, w) =>
    drawProportionBar(doc, "Sumber Data",
      sumberSummary.sumber.map((s, i) => ({ label: s.nama, value: s.jumlah, color: SUMBER_COLORS[i % SUMBER_COLORS.length] })),
      x, cy, w)
  );

  if (topSektor.length) {
    y = drawCard(doc, y, 30 + topSektor.length * 24, (x, cy, w) => drawSektorBars(doc, topSektor, x, cy, w));
  }

  // ===== SECTION 2: Daftar Berita =====
  // Selalu mulai di halaman baru -- KECUALI kita kebetulan sudah berada tepat
  // di awal halaman kosong (karena ensureSpace() di atas otomatis pindah
  // halaman duluan), supaya tidak dobel jadi halaman kosong tambahan.
  if (y > PAGE_MARGIN + 20) {
    doc.addPage();
  }
  y = drawHeader(doc);
  doc.fontSize(14).fillColor(INK).font("Helvetica-Bold").text("Daftar Fenomena / Berita", PAGE_MARGIN, y);
  y += 20;
  doc.fontSize(9).fillColor(SOFT).font("Helvetica")
    .text(`${totals.total} data sesuai filter yang dipilih${totals.total > MAX_PRINTED ? ` (ditampilkan ${MAX_PRINTED} teratas)` : ""}`, PAGE_MARGIN, y);
  y += 24;

  printedData.forEach((item, idx) => {
    const title = `${idx + 1}. ${item.judul}`;
    const metaLine = `${formatDateTime(item.tanggal)} · ${item.sektor || "-"} · ${item.distrik || "-"} · ${item.namaSumber || "-"}`;
    const uraianText = item.uraian ? item.uraian.slice(0, 220) : "";

    // WAJIB ukur tinggi teks yang SEBENARNYA sebelum gambar apa pun --
    // judul panjang bisa turun ke 2-3 baris, dan kalau y cuma dimajuin
    // dengan angka tetap (asumsi selalu 1 baris), baris berikutnya bakal
    // numpuk di atas sisa judul yang belum kegambar (bug sebelumnya).
    doc.font("Helvetica-Bold").fontSize(9.5);
    const titleHeight = doc.heightOfString(title, { width: CONTENT_WIDTH });

    doc.font("Helvetica").fontSize(7.5);
    const metaHeight = doc.heightOfString(metaLine, { width: CONTENT_WIDTH });

    const sentimenLineHeight = 12; // baris pendek, hampir pasti 1 baris, aman pakai angka tetap

    let uraianHeight = 0;
    if (uraianText) {
      doc.font("Helvetica").fontSize(8.5);
      uraianHeight = doc.heightOfString(uraianText, { width: CONTENT_WIDTH });
    }

    const rowHeight = titleHeight + 4 + metaHeight + 4 + sentimenLineHeight + 4 + (uraianText ? uraianHeight + 6 : 0) + 8;

    y = ensureSpace(doc, y, rowHeight + 10);

    if (idx % 2 === 0) {
      doc.rect(PAGE_MARGIN - 6, y - 4, CONTENT_WIDTH + 12, rowHeight).fill(BG);
    }

    doc.fontSize(9.5).fillColor(INK).font("Helvetica-Bold").text(title, PAGE_MARGIN, y, { width: CONTENT_WIDTH });
    y += titleHeight + 4;

    doc.fontSize(7.5).fillColor(SOFT).font("Helvetica").text(metaLine, PAGE_MARGIN, y, { width: CONTENT_WIDTH });
    y += metaHeight + 4;

    const sentimenColor = item.sentimen === "Positif" ? TEAL : item.sentimen === "Negatif" ? CORAL : NEUTRAL;
    doc.fontSize(7.5).fillColor(sentimenColor).font("Helvetica-Bold").text(item.sentimen || "-", PAGE_MARGIN, y, { continued: true });
    doc.fillColor(SOFT).font("Helvetica").text(`   ·   Status: ${item.status === "Draft" ? "Tercatat" : item.status}`, { continued: false });
    y += sentimenLineHeight + 4;

    if (uraianText) {
      doc.fontSize(8.5).fillColor(INK).font("Helvetica").text(uraianText, PAGE_MARGIN, y, { width: CONTENT_WIDTH });
      y += uraianHeight + 6;
    }
    y += 8;
  });

  if (!printedData.length) {
    doc.fontSize(9).fillColor(SOFT).font("Helvetica").text("Tidak ada fenomena yang cocok dengan filter ini.", PAGE_MARGIN, y);
  }

  // PENTING: nulis teks di y=810 dianggap PDFKit "meluber" dari margin bawah
  // halaman A4 (~802px dengan margin 40), dan itu memicu doc.addPage() OTOMATIS
  // tiap kali footer ditulis -- efeknya satu halaman kosong tambahan per
  // halaman asli, dan nomor halamannya sendiri malah lompat ke halaman kosong
  // itu (bukan ke halaman yang dimaksud). Fix: nolin margin bawah SEMENTARA
  // pas nulis footer, biar PDFKit gak nganggep ini "meluber".
  const pageCount = doc.bufferedPageRange().count;
  const footerY = doc.page.height - 32; // ~810 utk A4, dihitung dari tinggi halaman asli
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.fontSize(7.5).fillColor(SOFT).font("Helvetica")
      .text(`Halaman ${i + 1} dari ${pageCount}`, PAGE_MARGIN, footerY, { width: CONTENT_WIDTH, align: "right" });
    doc.page.margins.bottom = originalBottomMargin;
  }

  doc.end();
  const buffer = await bufferPromise;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${buildExportFilename(searchParams, "pdf")}"`,
    },
  });
}