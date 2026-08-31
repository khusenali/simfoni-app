import { NextResponse } from "next/server";
import { scrapeAllNewsFeeds } from "../../../../lib/newsScraper";
import { db } from "../../../../lib/db";
const { isValidNeracaPin } = require("../../../../lib/auth");

// Dua jalur yang sah manggil endpoint ini:
// 1) GitHub Actions (cron otomatis) -- kirim header x-scrape-key.
// 2) Tim Neraca lewat tombol "Sinkron" di UI -- browser gak boleh nyimpen
//    SCRAPE_TRIGGER_KEY (itu rahasia server), jadi dia kirim PIN Neraca yang
//    udah di-unlock sebagai bukti otorisasi manusia, bukan secret cron.
function isAuthorized(request) {
  const requiredKey = process.env.SCRAPE_TRIGGER_KEY;
  if (requiredKey && request.headers.get("x-scrape-key") === requiredKey) return true;
  if (isValidNeracaPin(request.headers.get("x-neraca-pin"))) return true;
  return !requiredKey; // belum diatur sama sekali -> jangan kunci diri sendiri di lokal/dev
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  try {
    const result = await scrapeAllNewsFeeds();
    await db.prepare(`
    INSERT INTO sync_log (tipe, last_sync, inserted, skipped) VALUES ('news', ?, ?, ?)
    ON CONFLICT(tipe) DO UPDATE SET last_sync = excluded.last_sync, inserted = excluded.inserted, skipped = excluded.skipped
    `).run(new Date().toISOString(), result.inserted, result.skipped);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}