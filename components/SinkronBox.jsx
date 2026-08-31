"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatDateTime } from "../lib/format";
import { useGlobalLoading } from "./GlobalLoadingContext";
import { useNeracaAccess } from "./NeracaAccessContext";

export default function SinkronBox({ onDone }) {
  const [scraping, setScraping] = useState({ news: false, meta: false });
  const [scrapeStatus, setScrapeStatus] = useState({ news: null, meta: null });
  const [lastSync, setLastSync] = useState({ news: null, meta: null });
  const { showLoading, hideLoading } = useGlobalLoading();
  const { pin } = useNeracaAccess();

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    const res = await fetch("/api/scrape/status");
    const json = await res.json();
    setLastSync({ news: json.news || null, meta: json.meta || null });
  }

  async function triggerScrape(type) {
    setScraping((s) => ({ ...s, [type]: true }));
    setScrapeStatus((s) => ({ ...s, [type]: null }));
    showLoading(type === "news" ? "Menyinkron portal berita..." : "Menyinkron Instagram & Facebook...");
    try {
      const res = await fetch(`/api/scrape/${type}`, {
        method: "POST",
        headers: pin ? { "x-neraca-pin": pin } : {},
      });
      const json = await res.json();
      if (!res.ok) {
        setScrapeStatus((s) => ({ ...s, [type]: { error: json.error || "Gagal menyinkron." } }));
        return;
      }

      setScrapeStatus((s) => ({ ...s, [type]: json }));
      await loadStatus();
      onDone?.();
    } catch (err) {
      setScrapeStatus((s) => ({ ...s, [type]: { error: err.message } }));
    } finally {
      hideLoading()
    }  
    setScraping((s) => ({ ...s, [type]: false }));
  }

  return (
    <div className="card p-5 mb-6">
      <h3 className="font-bold text-ink mb-1">Sinkronkan Data Otomatis</h3>
      <p className="text-sm text-slate-soft mb-4">
        Ambil fenomena terbaru terkait Raja Ampat dari portal berita dan akun Instagram/Facebook resmi yang terdaftar.
      </p>
      <div className="flex flex-wrap gap-6">
        <div>
          <ScrapeButton label="Sinkron Portal Berita" loading={scraping.news} onClick={() => triggerScrape("news")} />
          <LastSync info={lastSync.news} />
        </div>
        <div>
          <ScrapeButton label="Sinkron Instagram & Facebook" loading={scraping.meta} onClick={() => triggerScrape("meta")} />
          <LastSync info={lastSync.meta} />
        </div>
      </div>
      <ScrapeResult label="Portal berita" result={scrapeStatus.news} />
      <ScrapeResult label="Media sosial" result={scrapeStatus.meta} />
    </div>
  );
}

function LastSync({ info }) {
  return (
    <p className="text-[11px] text-slate-soft mt-1.5">
      {info?.last_sync ? `Terakhir disinkronkan: ${formatDateTime(info.last_sync)}` : "Belum pernah disinkronkan"}
    </p>
  );
}

function ScrapeButton({ label, loading, onClick }) {
  return (
    <button
      type="button" onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-line bg-white text-sm font-semibold text-ink hover:bg-bg disabled:opacity-60"
    >
      <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
      {loading ? "Menyinkronkan..." : label}
    </button>
  );
}

function ScrapeResult({ label, result }) {
  if (!result) return null;
  if (result.error) {
    return <p className="text-xs text-coral mt-2">{label}: gagal — {result.error}</p>;
  }
  return (
    <p className="text-xs text-slate-soft mt-2">
      {label}: {result.inserted} data baru, {result.mirip || 0} di antaranya terindikasi mirip data lain, {result.skipped} dilewati (duplikat persis/tidak relevan).
      {result.note ? ` ${result.note}` : ""}
    </p>
  );
}