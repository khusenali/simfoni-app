// lib/fenomenaRepo.js
// Lapisan akses data untuk tabel fenomena & tabel referensinya.
const { db } = require("./db");
const { isRajaAmpatRelated } = require("./textmining");
const { saveFenomenaClassification } = require("./kbliClassifier");

// Dilempar dari insertFenomena() saat url yang dikirim TERNYATA sudah ada
// (race/lolos dari pre-check findByUrl). Sengaja dibedakan dari error lain
// supaya pemanggil (mis. ingestFeedItems di newsScraper.js) bisa ngitung ini
// sebagai "dilewati/duplikat", bukan diam-diam dihitung "berhasil insert"
// padahal sebenarnya cuma balikin id lama.
class DuplicateUrlError extends Error {
  constructor(existingId) {
    super("URL sudah ada di database, tidak disisipkan ulang.");
    this.name = "DuplicateUrlError";
    this.existingId = existingId;
  }
}

async function getOrCreateSektor(nama) {
  if (!nama) return null;
  const existing = await db.prepare("SELECT id FROM sektor WHERE nama = ?").get(nama);
  if (existing) return existing.id;
  const info = await db.prepare("INSERT INTO sektor (nama) VALUES (?)").run(nama);
  return info.lastInsertRowid;
}

async function getOrCreateDistrik(nama) {
  if (!nama) return null;
  const existing = await db.prepare("SELECT id FROM distrik WHERE nama = ?").get(nama);
  if (existing) return existing.id;
  const info = await db.prepare("INSERT INTO distrik (nama) VALUES (?)").run(nama);
  return info.lastInsertRowid;
}

async function findByUrl(url) {
  if (!url) return null;
  return await db.prepare("SELECT id FROM fenomena WHERE url = ?").get(url);
}

async function insertFenomena(payload) {
  const sektor_id = payload.sektor_id || (await getOrCreateSektor(payload.sektor_nama));
  const distrik_id = payload.distrik_id || (await getOrCreateDistrik(payload.distrik_nama || payload.lokasi));

  const stmt = db.prepare(`
    INSERT INTO fenomena
      (tanggal, judul, uraian, penyebab, dampak, sumber_tipe, sumber_id, nama_sumber,
       url, lokasi, distrik_id, sektor_id, keyword, sentimen, status, penulis, media, mirip_dengan_id, skor_kemiripan)
    VALUES (@tanggal, @judul, @uraian, @penyebab, @dampak, @sumber_tipe, @sumber_id, @nama_sumber,
       @url, @lokasi, @distrik_id, @sektor_id, @keyword, @sentimen, @status, @penulis, @media, @mirip_dengan_id, @skor_kemiripan)
  `);

  let info;
  try {
    info = await stmt.run({
      tanggal: payload.tanggal,
      judul: payload.judul,
      uraian: payload.uraian || null,
      penyebab: payload.penyebab || null,
      dampak: payload.dampak || null,
      sumber_tipe: payload.sumber_tipe,
      sumber_id: payload.sumber_id || null,
      nama_sumber: payload.nama_sumber || null,
      url: payload.url || null,
      lokasi: payload.lokasi || null,
      distrik_id,
      sektor_id,
      keyword: JSON.stringify(payload.keyword || []),
      sentimen: payload.sentimen || "Netral",
      status: payload.status || "Draft",
      penulis: payload.penulis || null,
      media: payload.media || null,
      mirip_dengan_id: payload.miripDenganId || null,
      skor_kemiripan: payload.skorKemiripan || null,
    });
  } catch (err) {
    // Catatan migrasi: better-sqlite3 melempar "SQLITE_CONSTRAINT_UNIQUE",
    // @libsql/client melempar "SQLITE_CONSTRAINT" (tanpa akhiran _UNIQUE).
    if (err.code === "SQLITE_CONSTRAINT" && payload.url) {
      // Race 2 proses sinkron bersamaan -- URL ini barusan kesimpen
      // proses lain pas fungsi ini masih jalan. BUKAN dianggap sukses diam-diam
      // (itu bug lama yang bikin penghitung "baru" jadi salah) -- dilempar
      // sebagai DuplicateUrlError biar pemanggil bisa hitung ini sebagai skip.
      const existing = await db.prepare("SELECT id FROM fenomena WHERE url = ?").get(payload.url);
      throw new DuplicateUrlError(existing?.id ?? null);
    }
    throw err;
  }

  if (payload.classification) {
    await db.prepare(`
      UPDATE fenomena
      SET klasifikasi_score = ?, klasifikasi_confidence = ?, classification_method = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      payload.classification.score || 0,
      payload.classification.confidence || 0,
      payload.classification.method || 'unclassified',
      info.lastInsertRowid
    );
    await saveFenomenaClassification(info.lastInsertRowid, payload.classification);
  }

  return info.lastInsertRowid;
}

function rowToApi(row) {
  return {
    id: row.id,
    tanggal: row.tanggal,
    judul: row.judul,
    uraian: row.uraian,
    penyebab: row.penyebab,
    dampak: row.dampak,

    sumberTipe: row.sumber_tipe,
    namaSumber: row.nama_sumber,
    url: row.url,

    lokasi: row.lokasi,
    distrik: row.distrik_nama || null,

    sektorId: row.sektor_id || null,
    sektor: row.sektor_nama || null,

    keyword: row.keyword
      ? JSON.parse(row.keyword)
      : [],

    sentimen: row.sentimen,
    status: row.status,

    classificationMethod:
      row.classification_method || null,

    klasifikasiScore:
      row.klasifikasi_score ?? null,

    klasifikasiConfidence:
      row.klasifikasi_confidence ?? null,

    penulis: row.penulis,
    media: row.media,
    createdAt: row.created_at,

    miripDenganId: row.mirip_dengan_id,
    skorKemiripan: row.skor_kemiripan,
  };
}

async function listFenomena({
  search, sektor, sumberTipe, distrik, status, sentimen, dateFrom, dateTo,
  sortBy, sortDir, limit = 20, offset = 0,
} = {}) {
  const where = [];
  const params = {};

  if (search) {
    where.push("(f.judul LIKE @search OR f.uraian LIKE @search OR f.lokasi LIKE @search OR f.keyword LIKE @search)");
    params.search = `%${search}%`;
  }
  if (sektor) {
    if (sektor === "__UNCLASSIFIED__") {
      where.push("f.sektor_id IS NULL");
    } else {
      where.push("s.nama = @sektor");
      params.sektor = sektor;
    }
  }
  if (sumberTipe) { where.push("f.sumber_tipe = @sumberTipe"); params.sumberTipe = sumberTipe; }
  if (distrik) { where.push("d.nama = @distrik"); params.distrik = distrik; }
  if (status) { where.push("f.status = @status"); params.status = status; }
  if (sentimen) { where.push("f.sentimen = @sentimen"); params.sentimen = sentimen; }
  if (dateFrom) { where.push("f.tanggal >= @dateFrom"); params.dateFrom = dateFrom; }
  if (dateTo) { where.push("f.tanggal <= @dateTo"); params.dateTo = dateTo; }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // Whitelist kolom yang boleh dipakai sortir -- JANGAN pernah masukkan
  // sortBy/sortDir dari user langsung ke SQL mentah (celah SQL injection).
  const SORT_COLUMNS = {
    judul: "f.judul",
    sektor: "s.nama",
    sentimen: "f.sentimen",
    status: "f.status",
    tanggal: "f.tanggal",
  };
  const sortColumn = SORT_COLUMNS[sortBy] || "f.tanggal";
  const sortDirection = sortDir === "asc" ? "ASC" : "DESC";
  const orderBySql = sortBy && SORT_COLUMNS[sortBy]
    ? `ORDER BY ${sortColumn} ${sortDirection}, f.id DESC`
    : "ORDER BY f.tanggal DESC, f.id DESC";

  const rows = await db.prepare(`
    SELECT f.*, s.nama as sektor_nama, d.nama as distrik_nama
    FROM fenomena f
    LEFT JOIN sektor s ON f.sektor_id = s.id
    LEFT JOIN distrik d ON f.distrik_id = d.id
    ${whereSql}
    ${orderBySql}
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit, offset });

  const total = (await db.prepare(`
    SELECT COUNT(*) as c
    FROM fenomena f
    LEFT JOIN sektor s ON f.sektor_id = s.id
    LEFT JOIN distrik d ON f.distrik_id = d.id
    ${whereSql}
  `).get(params)).c;

  return { data: rows.map(rowToApi), total };
}

async function getById(id) {
  const row = await db.prepare(`
    SELECT f.*, s.nama as sektor_nama, d.nama as distrik_nama
    FROM fenomena f
    LEFT JOIN sektor s ON f.sektor_id = s.id
    LEFT JOIN distrik d ON f.distrik_id = d.id
    WHERE f.id = ?
  `).get(id);
  if (!row) return null;

  const indikator = await db.prepare(`
    SELECT i.id, i.nama, i.kategori
    FROM fenomena_indikator fi
    JOIN indikator_bps i ON fi.indikator_id = i.id
    WHERE fi.fenomena_id = ?
  `).all(id);

  const klasifikasi = await db.prepare(`
    SELECT fk.skor, fk.peringkat,
           k.id, k.kode, k.level, k.nama, k.uraian,
           s.id AS sektor_id, s.nama AS sektor_nama
    FROM fenomena_kbli fk
    JOIN kbli_2025 k ON k.id = fk.kbli_id
    LEFT JOIN kbli_sektor ks ON ks.kbli_id = k.id
    LEFT JOIN sektor s ON s.id = ks.sektor_id
    WHERE fk.fenomena_id = ?
    ORDER BY fk.peringkat ASC
  `).all(id);

  return { ...rowToApi(row), indikator, klasifikasi };
}

async function updateFenomena(id, payload) {
  const fields = [];
  const params = { id };

  const allowed = [
    "tanggal",
    "judul",
    "uraian",
    "penyebab",
    "dampak",
    "lokasi",
    "sentimen",
    "status",
    "media",
    "url",
  ];

  for (const key of allowed) {
    if (payload[key] !== undefined) {
      fields.push(`${key} = @${key}`);
      params[key] = payload[key];
    }
  }

  // ============================================================
  // VALIDASI SEKTOR PDRB
  // ============================================================

  // Pilihan sektor menggunakan sektor_id
  if (payload.sektor_id !== undefined) {
    fields.push("sektor_id = @sektor_id");
    params.sektor_id = payload.sektor_id || null;

    // Perubahan sektor oleh Tim Neraca dianggap validasi manual.
    fields.push("classification_method = 'manual_validation'");
  }

  // Kompatibilitas dengan kode lama yang masih mengirim sektor_nama.
  else if (payload.sektor_nama !== undefined) {

    // null / string kosong = Tidak terklasifikasi.
    if (
      payload.sektor_nama === null ||
      payload.sektor_nama === ""
    ) {
      fields.push("sektor_id = NULL");
      fields.push("classification_method = 'manual_validation'");
    } else {
      fields.push("sektor_id = @sektor_id");
      params.sektor_id = await getOrCreateSektor(payload.sektor_nama);

      fields.push("classification_method = 'manual_validation'");
    }
  }

  // ============================================================
  // VALIDASI DISTRIK
  // ============================================================

  if (payload.distrik_nama !== undefined) {
    fields.push("distrik_id = @distrik_id");
    params.distrik_id = await getOrCreateDistrik(payload.distrik_nama);
  }

  if (!fields.length) {
    return await getById(id);
  }

  fields.push("updated_at = datetime('now')");

  await db.prepare(`
    UPDATE fenomena
    SET ${fields.join(", ")}
    WHERE id = @id
  `).run(params);

  return await getById(id);
}

async function deleteFenomena(id) {
  const existing = await db.prepare("SELECT id FROM fenomena WHERE id = ?").get(id);
  if (!existing) return { ok: false, reason: "not_found" };

  const tx = db.transaction(async (txDb) => {
    // Putus dulu semua rujukan "mirip" yang menunjuk ke baris ini,
    // sebelum baris ini dihapus -- jaga-jaga kalau skema database yang
    // sedang berjalan belum punya ON DELETE SET NULL yang konsisten
    // (mis. tabel sudah dibuat sebelum aturan itu ditambahkan ke kode).
    await txDb.prepare("UPDATE fenomena SET mirip_dengan_id = NULL, skor_kemiripan = NULL WHERE mirip_dengan_id = ?").run(id);
    await txDb.prepare("DELETE FROM fenomena WHERE id = ?").run(id);
  });
  await tx();

  return { ok: true };
}

async function linkIndikator(fenomenaId, indikatorIds) {
  const tx = db.transaction(async (txDb, ids) => {
    await txDb.prepare("DELETE FROM fenomena_indikator WHERE fenomena_id = ?").run(fenomenaId);
    for (const iid of ids) {
      await txDb.prepare("INSERT OR IGNORE INTO fenomena_indikator (fenomena_id, indikator_id) VALUES (?, ?)").run(fenomenaId, iid);
    }
  });
  await tx(indikatorIds);
  return await getById(fenomenaId);
}

async function getSektorList() {
  return await db.prepare("SELECT id, nama FROM sektor ORDER BY nama").all();
}
async function getDistrikList() {
  return await db.prepare("SELECT id, nama FROM distrik ORDER BY nama").all();
}
async function getIndikatorList() {
  return await db.prepare("SELECT id, nama, kategori FROM indikator_bps ORDER BY nama").all();
}

const { titleSimilarity } = require("./textmining");

async function findSimilarFenomena(judul, tanggal, threshold = 0.5) {
  const rows = await db.prepare(`
    SELECT id, judul, tanggal FROM fenomena
    WHERE tanggal >= datetime(?, '-14 days') AND tanggal <= datetime(?, '+14 days')
  `).all(tanggal, tanggal);

  let best = null;
  for (const row of rows) {
    const score = titleSimilarity(judul, row.judul);
    if (score >= threshold && (!best || score > best.score)) {
      best = { id: row.id, score, tanggal: row.tanggal };
    }
  }
  return best;
}

async function markSimilar(id, miripDenganId, skorKemiripan) {
  await db.prepare(`UPDATE fenomena SET mirip_dengan_id = ?, skor_kemiripan = ? WHERE id = ?`).run(miripDenganId, skorKemiripan, id);
}

async function listMiripGroups({ search, sektor, distrik, status, dateFrom, dateTo, limit = 5, offset = 0 } = {}) {
  const where = [
    "(f.mirip_dengan_id IS NOT NULL OR f.id IN (SELECT mirip_dengan_id FROM fenomena WHERE mirip_dengan_id IS NOT NULL))",
  ];
  const params = {};
  if (search) { where.push("(f.judul LIKE @search OR f.uraian LIKE @search OR f.lokasi LIKE @search OR f.keyword LIKE @search)"); params.search = `%${search}%`; }
  if (sektor) { where.push("s.nama = @sektor"); params.sektor = sektor; }
  if (distrik) { where.push("d.nama = @distrik"); params.distrik = distrik; }
  if (status) { where.push("f.status = @status"); params.status = status; }
  if (dateFrom) { where.push("f.tanggal >= @dateFrom"); params.dateFrom = dateFrom; }
  if (dateTo) { where.push("f.tanggal <= @dateTo"); params.dateTo = dateTo; }

  const rows = await db.prepare(`
    SELECT f.*, s.nama AS sektor_nama, d.nama AS distrik_nama
    FROM fenomena f
    LEFT JOIN sektor s ON s.id = f.sektor_id
    LEFT JOIN distrik d ON d.id = f.distrik_id
    WHERE ${where.join(" AND ")}
    ORDER BY f.tanggal DESC
  `).all(params);

  const items = rows.map(rowToApi);

  const parent = new Map();
  function find(x) {
    if (!parent.has(x)) parent.set(x, x);
    while (parent.get(x) !== x) x = parent.get(x);
    return x;
  }
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  items.forEach((it) => {
    find(it.id);
    if (it.miripDenganId) union(it.id, it.miripDenganId);
  });

  const clusters = new Map();
  items.forEach((it) => {
    const root = find(it.id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(it);
  });

  const allGroups = Array.from(clusters.values())
    .map((members) => ({
      members: members.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)),
      skorTertinggi: Math.max(...members.map((m) => m.skorKemiripan || 0)),
    }))
    .sort((a, b) => b.skorTertinggi - a.skorTertinggi);

  // Total fenomena LINTAS semua kelompok (bukan cuma jumlah kelompoknya),
  // dihitung dari seluruh klaster sebelum dipotong per halaman -- biar
  // angkanya tetap akurat walau lagi nampilin 5 dari 10 kelompok doang.
  const totalFenomena = allGroups.reduce((sum, g) => sum + g.members.length, 0);

  return {
    total: allGroups.length,
    totalFenomena,
    groups: allGroups.slice(offset, offset + limit),
  };
}

// Dipakai semua alur insert (scraping berita, medsos, input manual, import Excel, seed)
// supaya tanda "Mirip" selalu nempel di data yang tanggalnya LEBIH BARU,
// bukan sekadar yang lebih dulu masuk ke database.
async function insertFenomenaWithSimilarity(payload) {
  const mirip = await findSimilarFenomena(payload.judul, payload.tanggal);
  if (!mirip) return await insertFenomena(payload);

  const skor = Math.round(mirip.score * 100);
  const dataBaruLebihBaru = new Date(payload.tanggal) >= new Date(mirip.tanggal);

  if (dataBaruLebihBaru) {
    // Data yang baru masuk ini tanggalnya lebih baru -> dia yang ditandai
    return await insertFenomena({ ...payload, miripDenganId: mirip.id, skorKemiripan: skor });
  }
  // Data yang baru masuk ini justru lebih lama -> data LAMA (yg tanggalnya lebih baru)
  // yang perlu ditandai, bukan yang baru ini.
  const newId = await insertFenomena(payload);
  await markSimilar(mirip.id, newId, skor);
  return newId;
}

// Bersihkan otomatis fenomena TIDAK relevan dari satu sumber tertentu —
// dipanggil otomatis di akhir tiap sesi scraping/backfill portal berita,
// sebagai jaring pengaman kalau ada yang lolos filter awal (mis. filter
// relevansi diperbarui belakangan, atau kasus tepi yang belum tercakup).
async function cleanupIrrelevantForSumber(namaSumber) {
  const rows = await db.prepare(`
    SELECT id, judul, uraian FROM fenomena
    WHERE nama_sumber = ? AND sumber_tipe = 'portal_berita'
  `).all(namaSumber);

  const toDelete = rows.filter((r) => !isRajaAmpatRelated(r.judul, r.uraian));
  if (!toDelete.length) return { checked: rows.length, deleted: 0 };

  const ids = toDelete.map((r) => r.id);
  const tx = db.transaction(async (txDb, idList) => {
    for (const id of idList) {
      await txDb.prepare(`UPDATE fenomena SET mirip_dengan_id = NULL, skor_kemiripan = NULL WHERE mirip_dengan_id = ?`).run(id);
    }
    for (const id of idList) {
      await txDb.prepare("DELETE FROM fenomena WHERE id = ?").run(id);
    }
  });
  await tx(ids);

  return { checked: rows.length, deleted: ids.length };
}

// Tanggal artikel terbaru yang sudah tersimpan dari satu nama sumber portal
// berita tertentu — dipakai sync biasa supaya cuma memproses berita yang
// lebih baru dari ini (selisih sejak sync terakhir), bukan seluruh isi RSS.
async function getLatestTanggalForSumber(namaSumber) {
  const row = await db.prepare(`
    SELECT MAX(tanggal) as latest FROM fenomena
    WHERE nama_sumber = ? AND sumber_tipe = 'portal_berita'
  `).get(namaSumber);
  return row?.latest || null;
}

module.exports = {
  insertFenomena, findByUrl, listFenomena, getById, updateFenomena, deleteFenomena,
  linkIndikator, getSektorList, getDistrikList, getIndikatorList, listMiripGroups,
  getOrCreateSektor, getOrCreateDistrik, findSimilarFenomena, markSimilar, insertFenomenaWithSimilarity, getLatestTanggalForSumber, cleanupIrrelevantForSumber,
  DuplicateUrlError,
};