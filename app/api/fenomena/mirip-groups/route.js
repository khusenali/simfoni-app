import { NextResponse } from "next/server";
import { listMiripGroups } from "../../../../lib/fenomenaRepo";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "5", 10);
  const result = await listMiripGroups({
    search: searchParams.get("search") || undefined,
    sektor: searchParams.get("sektor") || undefined,
    distrik: searchParams.get("distrik") || undefined,
    status: searchParams.get("status") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return NextResponse.json({ ...result, page, pageSize });
}