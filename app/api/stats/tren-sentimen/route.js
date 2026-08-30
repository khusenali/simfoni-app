import { NextResponse } from "next/server";
import { getTrenSentimen } from "../../../../lib/statsRepo";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const months = parseInt(searchParams.get("months") || "9", 10);
  const sektor = searchParams.get("sektor") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  return NextResponse.json({ data: await getTrenSentimen(months, { sektor, dateFrom, dateTo }) });
}