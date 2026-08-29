import ExcelJS from "exceljs";
import { listFenomena } from "../../../../lib/fenomenaRepo";
import { formatDateTime } from "../../../../lib/format";
import { buildExportFilename } from "../../../../lib/exportFilename";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

const { data } = listFenomena({
  search: searchParams.get("search") || undefined,
  sektor: searchParams.get("sektor") || undefined,
  sumberTipe: searchParams.get("sumberTipe") || undefined,
  status: searchParams.get("status") || undefined,
  dateFrom: searchParams.get("dateFrom") || undefined,
  dateTo: searchParams.get("dateTo") || undefined,
  limit: 100000,
  offset: 0,
});

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIMFONI - BPS Kabupaten Raja Ampat";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Fenomena Ekonomi");
  sheet.columns = [
    { header: "Tanggal", key: "tanggal", width: 14 },
    { header: "Judul Fenomena", key: "judul", width: 40 },
    { header: "Uraian", key: "uraian", width: 50 },
    { header: "Sektor", key: "sektor", width: 16 },
    { header: "Lokasi/Distrik", key: "distrik", width: 16 },
    { header: "Sumber Data", key: "sumberTipe", width: 16 },
    { header: "Nama Sumber", key: "namaSumber", width: 22 },
    { header: "Sentimen", key: "sentimen", width: 12 },
    { header: "Status", key: "status", width: 14 },
    { header: "Kata Kunci", key: "keywordStr", width: 30 },
    { header: "Tautan", key: "url", width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2A3D" } };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  data.forEach((row) => {
    sheet.addRow({ ...row, status: row.status === "Draft" ? "Tercatat" : row.status, tanggal: formatDateTime(row.tanggal), keywordStr: (row.keyword || []).join(", ") });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${buildExportFilename(searchParams, "xlsx")}"`,
    },
  });
}
