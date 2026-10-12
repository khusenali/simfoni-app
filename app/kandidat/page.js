"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Sparkles, Check, X, Lock, ExternalLink, CheckSquare, Square, Search } from "lucide-react";
import { useNeracaAccess } from "../../components/NeracaAccessContext";
import NeracaUnlockModal from "../../components/NeracaUnlockModal";
import { useGlobalLoading } from "../../components/GlobalLoadingContext";
import { formatDateTime } from "../../lib/format";

function relevansiBadgeClass(label) {
  if (label === "Tinggi") return "bg-teal-dark/10 text-teal-dark";
  if (label === "Sedang") return "bg-amber-500/10 text-amber-600";
  if (label === "Rendah") return "bg-coral/10 text-coral";
  return "bg-bg text-slate-soft";
}

function toDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export default function KandidatPage() {
  const { unlocked, pin } = useNeracaAccess();
  const [showUnlock, setShowUnlock] = useState(false);
  const [items, setItems] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [sektorOptions, setSektorOptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSektor, setFilterSektor] = useState("");
  const [filterSumber, setFilterSumber] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const { showLoading, hideLoading } = useGlobalLoading();

  const load = useCallback(async () => {
    const res = await fetch("/api/kandidat");
    const json = await res.json();
    setItems(json.data || []);
    setLastScan(json.lastScan || null);
    setSelected(new Set());
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    load();
    fetch("/api/sektor")
      .then((r) => r.json())
      .then((data) => setSektorOptions(Array.isArray(data) ? data : []))
      .catch(() => setSektorOptions([]));
  }, [unlocked, load]);

  const sumberOptions = useMemo(() => {
    const set = new Set();
    items.forEach((k) => { if (k.sumber_disebutkan) set.add(k.sumber_disebutkan); });
    return [...set].sort();
  }, [items]);

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((k) => {
      if (q) {
        const haystack = `${k.judul || ""} ${k.ringkasan || ""} ${k.sumber_disebutkan || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filterSektor === "__kosong__" && k.sektor_nama) return false;
      if (filterSektor && filterSektor !== "__kosong__" && k.sektor_nama !== filterSektor) return false;
      if (filterSumber && k.sumber_disebutkan !== filterSumber) return false;
      const tgl = toDateOnly(k.tanggal || k.dicari_pada);
      if (filterDateFrom && (!tgl || tgl < filterDateFrom)) return false;
      if (filterDateTo && (!tgl || tgl > filterDateTo)) return false;
      return true;
    });
  }, [items, searchQuery, filterSektor, filterSumber, filterDateFrom, filterDateTo]);

  const filterActive = !!(searchQuery || filterSektor || filterSumber || filterDateFrom || filterDateTo);

  function clearFilters() {
    setSearchQuery("");
    setFilterSektor("");
    setFilterSumber("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  async function scan() {
    setScanning(true);
    setScanResult(null);
    showLoading("Mencari berita ...");
    try {
      const res = await fetch("/api/kandidat/scan", {
        method: "POST",
        headers: pin ? { "x-neraca-pin": pin } : {},
      });
      const json = await res.json();
      if (!res.ok) {
        setScanResult({ error: json.error || "Gagal mencari kandidat." });
      } else {
        setScanResult(json);
        await load();
      }
    } catch (err) {
      setScanResult({ error: err.message });
    } finally {
      hideLoading();
      setScanning(false);
    }
  }

  async function act(id, action) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/kandidat/${id}/${action}`, {
        method: "POST",
        headers: pin ? { "x-neraca-pin": pin } : {},
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Gagal memproses.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllItems() {
    setSelected(new Set(items.map((k) => k.id)));
  }

  function selectFilteredItems() {
    setSelected(new Set(visibleItems.map((k) => k.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  async function bulkAct(action) {
    if (!selected.size) return;
    const label = action === "approve" ? "menyetujui" : "menolak";
    if (!confirm(`Yakin ${label} ${selected.size} kandidat terpilih?`)) return;
    setBulkBusy(true);
    showLoading(action === "approve" ? "Menyetujui kandidat terpilih ..." : "Menolak kandidat terpilih ...");
    try {
      const res = await fetch("/api/kandidat/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(pin ? { "x-neraca-pin": pin } : {}),
        },
        body: JSON.stringify({ ids: [...selected], action }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Gagal memproses kandidat terpilih.");
        return;
      }
      if (json.gagal > 0) {
        alert(`${json.berhasil} berhasil, ${json.gagal} gagal (kemungkinan duplikat/sudah ditinjau).`);
      }
      await load();
    } finally {
      hideLoading();
      setBulkBusy(false);
    }
  }

  if (!unlocked) {
    return (
      <div className="pt-24 flex flex-col items-center justify-center text-center gap-3 max-w-sm mx-auto">
        <div className="w-12 h-12 rounded-full bg-bg flex items-center justify-center text-slate-soft">
          <Lock size={20} />
        </div>
        <div>
          <h1 className="font-bold text-ink mb-1">Halaman Tim Neraca</h1>
          <p className="text-sm text-slate-soft">Halaman ini khusus untuk Tim Neraca meninjau kandidat berita lain. Masukkan PIN untuk melanjutkan.</p>
        </div>
        <button
          onClick={() => setShowUnlock(true)}
          className="px-5 py-2.5 rounded-lg bg-teal-dark text-white text-sm font-semibold hover:bg-teal-dark/90"
        >
          Buka dengan PIN
        </button>
        <Link href="/fenomena" className="text-sm text-slate-soft hover:text-ink underline mt-1">Kembali ke Validasi Fenomena</Link>
        <NeracaUnlockModal open={showUnlock} onClose={() => setShowUnlock(false)} />
      </div>
    );
  }

  return (
    <div className="pt-8">
      <Link href="/fenomena" className="text-sm text-slate-soft mb-4 inline-block hover:text-ink">← Kembali ke Validasi Fenomena</Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Kandidat Berita Baru</h1>
          <p className="text-sm text-slate-soft mt-1">
            Hasil pencarian dari sumber di luar 3 portal resmi. Tinjau lalu setujui/tolak sebelum masuk daftar fenomena.
          </p>
        </div>
        <div>
          <button
            onClick={scan}
            disabled={scanning}
            className="flex items-center justify-center gap-2 px-3 tablet:px-4 py-2.5 rounded-lg bg-teal-dark text-white text-sm font-semibold hover:bg-teal-dark/90 disabled:opacity-60 w-full"
          >
            <Sparkles size={16} className="shrink-0" />
            <span className="hidden tablet:inline">{scanning ? "Mencari..." : "Cari Berita Baru"}</span>
          </button>
          <p className="text-xs text-slate-soft mt-1.5 text-right">
            {lastScan ? `Terakhir dicari: ${formatDateTime(lastScan)}` : "Belum pernah dicari"}
          </p>
        </div>
      </div>

      {scanResult && (
        <div className={`card p-4 mb-5 text-sm ${scanResult.error ? "text-coral" : "text-slate-soft"}`}>
          {scanResult.error
            ? `Gagal: ${scanResult.error}`
            : `Ditemukan ${scanResult.ditemukan}, baru ${scanResult.baru}, dilewati ${scanResult.dilewati} (sudah ada/duplikat/domain terkecuali).`}
        </div>
      )}

      {items.length > 0 && (
        <div className="card p-4 mb-5 flex flex-col gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-soft" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul, ringkasan, atau sumber kandidat..."
              className="text-sm border border-line rounded-lg pl-9 pr-3 py-2 bg-white w-full"
            />
          </div>

          <div className="grid grid-cols-2 tablet:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-soft">Sektor</label>
              <select
                value={filterSektor}
                onChange={(e) => setFilterSektor(e.target.value)}
                className="text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white w-full"
              >
                <option value="">Semua sektor</option>
                {sektorOptions.map((s) => (
                  <option key={s.id} value={s.nama}>{s.nama}</option>
                ))}
                <option value="__kosong__">Belum terklasifikasi</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-soft">Sumber berita</label>
              <select
                value={filterSumber}
                onChange={(e) => setFilterSumber(e.target.value)}
                className="text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white w-full"
              >
                <option value="">Semua sumber</option>
                {sumberOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-soft">Dari tanggal</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-soft">Sampai tanggal</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="text-sm border border-line rounded-lg px-2.5 py-1.5 bg-white w-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            {filterActive ? (
              <button onClick={clearFilters} className="text-xs text-slate-soft hover:text-ink underline">
                Hapus filter
              </button>
            ) : <span />}
            <span className="text-xs text-slate-soft">{visibleItems.length} dari {items.length} kandidat</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line">
            <span className="text-xs font-semibold text-slate-soft mr-1">Pilih:</span>
            <button onClick={selectAllItems} className="text-xs px-2.5 py-1.5 rounded-lg border border-line hover:bg-bg">
              Semua ({items.length})
            </button>
            <button
              onClick={selectFilteredItems}
              disabled={!filterActive}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-line hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed"
              title={filterActive ? "" : "Set filter dulu di atas"}
            >
              Hasil Filter ({visibleItems.length})
            </button>
            <button onClick={selectNone} className="text-xs px-2.5 py-1.5 rounded-lg border border-line hover:bg-bg">
              Kosongkan
            </button>
            <span className="text-xs text-slate-soft">atau centang manual satu-satu di tiap kartu</span>

            {selected.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs font-semibold text-ink">{selected.size} terpilih</span>
                <button
                  onClick={() => bulkAct("reject")}
                  disabled={bulkBusy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-xs font-semibold text-coral hover:bg-bg disabled:opacity-50"
                >
                  <X size={13} /> Tolak Terpilih
                </button>
                <button
                  onClick={() => bulkAct("approve")}
                  disabled={bulkBusy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-dark text-white text-xs font-semibold hover:bg-teal-dark/90 disabled:opacity-50"
                >
                  <Check size={13} /> Setujui Terpilih
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-soft">
          Belum ada kandidat menunggu tinjauan. Klik &quot;Cari Berita Baru&quot; untuk mencari yang baru.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((k) => (
            <div key={k.id} className={`card p-5 ${selected.has(k.id) ? "ring-2 ring-teal-dark" : ""}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleSelect(k.id)}
                    className="mt-0.5 text-slate-soft hover:text-teal-dark shrink-0"
                    title="Pilih kandidat ini"
                  >
                    {selected.has(k.id) ? <CheckSquare size={18} className="text-teal-dark" /> : <Square size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      {k.sektor_nama && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-bg text-ink">
                          {k.sektor_nama}
                        </span>
                      )}
                      {k.label_relevansi && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${relevansiBadgeClass(k.label_relevansi)}`}>
                          Relevansi {k.label_relevansi} ({k.skor_relevansi})
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-ink mb-1">{k.judul}</h3>
                    <p className="text-xs text-slate-soft mb-2">
                      {k.sumber_disebutkan || "Sumber tidak diketahui"} {k.tanggal ? `· ${formatDateTime(k.tanggal)}` : ""}
                    </p>
                    {k.ringkasan && <p className="text-sm text-ink mb-2">{k.ringkasan}</p>}
                    <a href={k.url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-dark hover:underline inline-flex items-center gap-1">
                      Buka sumber asli <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => act(k.id, "reject")}
                    disabled={busyId === k.id}
                    title="Tolak"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-line text-sm font-semibold text-coral hover:bg-bg disabled:opacity-50"
                  >
                    <X size={15} /> <span className="hidden tablet:inline">Tolak</span>
                  </button>
                  <button
                    onClick={() => act(k.id, "approve")}
                    disabled={busyId === k.id}
                    title="Setujui"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-dark text-white text-sm font-semibold hover:bg-teal-dark/90 disabled:opacity-50"
                  >
                    <Check size={15} /> <span className="hidden tablet:inline">Terima</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}