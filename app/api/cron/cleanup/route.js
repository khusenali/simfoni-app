// app/api/cron/cleanup/route.js
import { NextResponse } from "next/server";
import { cleanupOldFenomena } from "../../../../lib/cleanupOldData";

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
    const result = await cleanupOldFenomena();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}