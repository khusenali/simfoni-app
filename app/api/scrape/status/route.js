import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.prepare("SELECT tipe, last_sync, inserted, skipped FROM sync_log").all();
  const map = {};
  rows.forEach((r) => { map[r.tipe] = r; });
  return NextResponse.json(map);
}