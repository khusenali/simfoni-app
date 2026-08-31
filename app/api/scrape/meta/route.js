import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { scrapeMetaSources } from "../../../../lib/metaApi";
const { isValidNeracaPin } = require("../../../../lib/auth");

// Sama seperti scrape/news: GitHub Actions pakai x-scrape-key,
// tombol manual di UI pakai PIN Neraca yang udah di-unlock.
function isAuthorized(request) {
  const requiredKey = process.env.SCRAPE_TRIGGER_KEY;
  if (requiredKey && request.headers.get("x-scrape-key") === requiredKey) return true;
  if (isValidNeracaPin(request.headers.get("x-neraca-pin"))) return true;
  return !requiredKey;
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  try {
    const sumberList = await db.prepare(`
      SELECT * FROM sumber WHERE platform IN ('instagram','facebook') AND aktif = 1
    `).all();
    if (!sumberList.length) {
      return NextResponse.json({ inserted: 0, skipped: 0, errors: [], note: "Belum ada akun terdaftar." });
    }
    const result = await scrapeMetaSources(sumberList);
    await db.prepare(`
    INSERT INTO sync_log (tipe, last_sync, inserted, skipped) VALUES ('meta', ?, ?, ?)
    ON CONFLICT(tipe) DO UPDATE SET last_sync = excluded.last_sync, inserted = excluded.inserted, skipped = excluded.skipped
    `).run(new Date().toISOString(), result.inserted, result.skipped);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}