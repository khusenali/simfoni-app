import { NextResponse } from "next/server";
import {
  getTotals, getSentimenSummary, getTopSektor, getSumberSummary,
  getSebaranDistrik, getKondisiEkonomi, getKondisiTerverifikasi,
  getKeywordCloud,
} from "../../../lib/statsRepo";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const prevDateFrom = searchParams.get("prevDateFrom") || undefined;
  const prevDateTo = searchParams.get("prevDateTo") || undefined;
  const range = { dateFrom, dateTo };

  return NextResponse.json({
    totals: await getTotals(range),
    kondisiEkonomi: await getKondisiEkonomi({ ...range, prevDateFrom, prevDateTo }),
    kondisiTerverifikasi: await getKondisiTerverifikasi(range),
    sentimenSummary: await getSentimenSummary(range),
    topSektor: await getTopSektor(20, range),
    sumberSummary: await getSumberSummary(range),
    sebaranDistrik: await getSebaranDistrik(range),
    keywordCloud: await getKeywordCloud({ ...range, limit: 40 }),
  });
}