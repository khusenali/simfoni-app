import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.prepare(`
      SELECT id, nama
      FROM sektor
      ORDER BY id
    `).all();

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/sektor:", error);

    return NextResponse.json(
      { error: "Gagal mengambil data sektor PDRB." },
      { status: 500 }
    );
  }
}