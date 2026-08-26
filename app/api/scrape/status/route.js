import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function GET() {
  const rows = db.prepare("SELECT tipe, last_sync, inserted, skipped FROM sync_log").all();
  const map = {};
  rows.forEach((r) => { map[r.tipe] = r; });
  return NextResponse.json(map);
}