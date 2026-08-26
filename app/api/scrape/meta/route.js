import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { scrapeMetaSources } from "../../../../lib/metaApi";

function isAuthorized(request) {
  const required = process.env.SCRAPE_TRIGGER_KEY;
  if (!required) return true;
  return request.headers.get("x-scrape-key") === required;
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }
  try {
    const sumberList = db.prepare(`
      SELECT * FROM sumber WHERE platform IN ('instagram','facebook') AND aktif = 1
    `).all();
    if (!sumberList.length) {
      return NextResponse.json({ inserted: 0, skipped: 0, errors: [], note: "Belum ada akun terdaftar." });
    }
    const result = await scrapeMetaSources(sumberList);
    db.prepare(`
    INSERT INTO sync_log (tipe, last_sync, inserted, skipped) VALUES ('meta', ?, ?, ?)
    ON CONFLICT(tipe) DO UPDATE SET last_sync = excluded.last_sync, inserted = excluded.inserted, skipped = excluded.skipped
    `).run(new Date().toISOString(), result.inserted, result.skipped);
    
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
