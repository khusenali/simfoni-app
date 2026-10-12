import { NextResponse } from "next/server";
import { listKandidatMenunggu } from "../../../lib/kandidatRepo";
import { getLastScanTime } from "../../../lib/kandidatScraper";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await listKandidatMenunggu();
  const lastScan = await getLastScanTime();
  return NextResponse.json({ data, total: data.length, lastScan });
}