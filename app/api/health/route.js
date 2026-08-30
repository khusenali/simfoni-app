import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

export async function GET() {
  try {
    const row = await db.prepare("SELECT COUNT(*) c FROM fenomena").get();
    return NextResponse.json({ status: "ok", totalFenomena: row.c, time: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}