import { NextResponse } from "next/server";
import { scrapeAllNewsFeeds } from "../../../../lib/newsScraper";
import { db } from "../../../../lib/db"

function isAuthorized(request) {
  const required = process.env.SCRAPE_TRIGGER_KEY;
  if (!required) return true; // tidak diwajibkan jika belum diatur
  return request.headers.get("x-scrape-key") === required;
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