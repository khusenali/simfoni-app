import { NextResponse } from "next/server";
import { getFenomenaPerPeriode } from "../../../../lib/statsRepo";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const granularity = searchParams.get("granularity") || "bulan";
  const count = parseInt(searchParams.get("count") || "9", 10);
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  return NextResponse.json({ data: getFenomenaPerPeriode(granularity, count, { dateFrom, dateTo }) });
}