"use client";

import { useEffect, useState, useMemo } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import Modal from "./Modal";
import { ConfirmDialog, useConfirm } from "./ConfirmDialog";
import PeriodFilter, { computeDateRange } from "./PeriodFilter";
import SearchableSelect from "./SearchableSelect";

const STATUS_OPTIONS = ["Draft", "Terverifikasi"];

export default function LaporanModal({ open, onClose, initialPeriod }) {
  const [sektorOptions, setSektorOptions] = useState([]);
  const [sektor, setSektor] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState(initialPeriod || { type: "semua", year: 2026, quarter: 3 });
  const [total, setTotal] = useState(null);
  const { confirm, dialogProps } = useConfirm();

    // Setiap kali modal dibuka, samakan dulu dengan periode yang sedang aktif
  // di dashboard -- supaya laporan yang diunduh sesuai dengan tampilan.
  useEffect(() => {
    if (open && initialPeriod) setPeriod(initialPeriod);
  }, [open, initialPeriod]);

  const { dateFrom, dateTo } = useMemo(() => computeDateRange(period), [period]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const res = await fetch("/api/indikator");
      const json = await res.json();
      setSektorOptions(json.sektor.map((s) => s.nama));
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const params = new URLSearchParams();
      if (sektor) params.set("sektor", sektor);
      if (status) params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("pageSize", "1");
      const res = await fetch(`/api/fenomena?${params.toString()}`);
      const json = await res.json();
      setTotal(json.total);
    })();
  }, [sektor, status, dateFrom, dateTo, open]);

  function buildQuery() {
    const params = new URLSearchParams();
    if (sektor) params.set("sektor", sektor);
    if (status) params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return params.toString();
  }

  async function download(format) {
    const ok = await confirm({
      title: `Unduh laporan ${format.toUpperCase()}?`,
      message: `${total ?? 0} fenomena sesuai filter akan diunduh sebagai file ${format === "excel" ? ".xlsx" : ".pdf"}.`,
      confirmLabel: "Ya, unduh",
    });
    if (!ok) return;
    window.location.href = `/api/export/${format}?${buildQuery()}`;
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Unduh Laporan"
        subtitle="Atur filter, lalu unduh laporan fenomena ekonomi dalam format PDF atau Excel"
        width="max-w-lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sektor Ekonomi">
              <SearchableSelect
                value={sektor || "Semua sektor"}
                onChange={(v) => setSektor(v === "Semua sektor" ? "" : v)}
                options={["Semua sektor", ...sektorOptions]}
              />
            </Field>
            <Field label="Status Validasi">
              <SearchableSelect
                value={status || "Semua status"}
                onChange={(v) => setStatus(v === "Semua status" ? "" : v)}
                options={["Semua status", ...STATUS_OPTIONS]}
                labels={{ Draft: "Tercatat" }}
              />
            </Field>
          </div>

          <Field label="Periode">
            <PeriodFilter value={period} onChange={setPeriod} types={["semua", "triwulan", "tahun"]} />
          </Field>

          <p className="text-sm text-slate-soft">
            {total === null ? "Menghitung..." : `${total} fenomena cocok dengan filter ini.`}
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => download("excel")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-dark"
            >
              <FileSpreadsheet size={16} /> Unduh Excel (.xlsx)
            </button>
            <button
              onClick={() => download("pdf")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-coral text-white text-sm font-semibold hover:opacity-90"
            >
              <FileText size={16} /> Unduh PDF
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog {...dialogProps} />
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}