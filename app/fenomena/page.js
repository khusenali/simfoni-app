"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MiripBadge } from "../../components/Badges";
import SinkronBox from "../../components/SinkronBox";
import PendataanModal from "../../components/PendataanModal";
import NeracaUnlockModal from "../../components/NeracaUnlockModal";
import { ConfirmDialog, useConfirm } from "../../components/ConfirmDialog";
import { useNeracaAccess } from "../../components/NeracaAccessContext";
import { formatDateTime } from "../../lib/format";
import SearchableSelect from "../../components/SearchableSelect";
import { Search, Plus, Lock, Trash2, Layers, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import SortableHeader from "../../components/SortableHeader";
import PeriodFilter, { computeDateRange } from "../../components/PeriodFilter";
import { useGlobalLoading } from "../../components/GlobalLoadingContext";

const SEKTOR_OPTIONS = [
  "Semua sektor",
  "A. Pertanian, Kehutanan, dan Perikanan",
  "B. Pertambangan dan Penggalian",
  "C. Industri Pengolahan",
  "D. Pengadaan Listrik dan Gas",
  "E. Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang",
  "F. Konstruksi",
  "G. Perdagangan Besar dan Eceran, Reparasi Mobil dan Sepeda Motor",
  "H. Transportasi dan Pergudangan",
  "I. Penyediaan Akomodasi dan Makan Minum",
  "J. Informasi dan Komunikasi",
  "K. Jasa Keuangan dan Asuransi",
  "L. Real Estat",
  "M, N. Jasa Perusahaan",
  "O. Administrasi Pemerintahan, Pertahanan, dan Jaminan Sosial Wajib",
  "P. Jasa Pendidikan",
  "Q. Jasa Kesehatan dan Kegiatan Sosial",
  "R, S, T, U. Jasa Lainnya",
];

const STATUS_LABEL = { Draft: "Tercatat", Terverifikasi: "Terverifikasi" };
const STATUS_OPTIONS = ["Draft", "Terverifikasi"];
const SENTIMEN_OPTIONS = ["Positif", "Netral", "Negatif"];
const ROW_OPTIONS = [10, 15, 25, 50];

export default function FenomenaPage() {
  const { unlocked, pin } = useNeracaAccess();
  const [showUnlock, setShowUnlock] = useState(false);

  if (!unlocked) {
    return (
      <div className="pt-24 flex flex-col items-center justify-center text-center gap-3 max-w-sm mx-auto">
        <div className="w-12 h-12 rounded-full bg-bg flex items-center justify-center text-slate-soft">
          <Lock size={20} />
        </div>
        <div>
          <h1 className="font-bold text-ink mb-1">Halaman Tim Neraca</h1>
          <p className="text-sm text-slate-soft">Halaman ini khusus untuk Tim Neraca melakukan validasi fenomena. Masukkan PIN untuk melanjutkan.</p>
        </div>
        <button
          onClick={() => setShowUnlock(true)}
          className="px-5 py-2.5 rounded-lg bg-teal-dark text-white text-sm font-semibold hover:bg-teal-dark/90"
        >
          Buka dengan PIN
        </button>
        <Link href="/" className="text-sm text-slate-soft hover:text-ink underline mt-1">Kembali ke Dashboard</Link>
        <NeracaUnlockModal open={showUnlock} onClose={() => setShowUnlock(false)} />
      </div>
    );
  }

  return <FenomenaList pin={pin} />;
}

function FenomenaList({ pin }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);
  
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [page, setPage] = useState(() => {
  const initial = parseInt(searchParams.get("page") || "1", 10);
   return initial;
  });
  const [pageSize, setPageSize] = useState(() => parseInt(searchParams.get("pageSize") || "10", 10));
  const [loading, setLoading] = useState(true);
  const [showPendataan, setShowPendataan] = useState(false);
  const { confirm, dialogProps } = useConfirm();
  const { showLoading, hideLoading } = useGlobalLoading();

  const [sektorList, setSektorList] = useState([]);
  const [groupMode, setGroupMode] = useState(false);
  const [groups, setGroups] = useState([]);
  const [groupTotal, setGroupTotal] = useState(0);
  const [groupTotalFenomena, setGroupTotalFenomena] = useState(0);
  const [groupPage, setGroupPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(5);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    fetch("/api/indikator")
      .then((res) => res.json())
      .then((json) => setSektorList(json.sektor || []));
  }, []);

  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") || "");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");

  // Debounce cuma buat teks yang lagi diketik -- aksi klik (pagination,
  // sortir, filter, ganti jumlah baris) harus langsung tanpa jeda buatan.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  const [sektor, setSektor] = useState(() => searchParams.get("sektor") || "Semua sektor");
  const [distrik, setDistrik] = useState(() => searchParams.get("distrik") || "Semua distrik");
  const [distrikList, setDistrikList] = useState([]);
  const [status, setStatus] = useState(() => searchParams.get("status") || "Semua status");
  const [period, setPeriod] = useState({
    type: "semua",
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    month: new Date().getMonth() + 1,
  });
  const { dateFrom, dateTo } = computeDateRange(period);
  
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    const params = new URLSearchParams({ page: String(groupPage), pageSize: String(groupPageSize) });
    if (search) params.set("search", search);
    if (sektor !== "Semua sektor") params.set("sektor", sektor);
    if (distrik !== "Semua distrik") params.set("distrik", distrik);
    if (status !== "Semua status") params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/fenomena/mirip-groups?${params.toString()}`);
    const json = await res.json();
    setGroups(json.groups || []);
    setGroupTotal(json.total || 0);
    setGroupTotalFenomena(json.totalFenomena || 0);
    setLoadingGroups(false);
  }, [groupPage, groupPageSize, search, sektor, distrik, status, dateFrom, dateTo]);

  useEffect(() => {
    if (groupMode) loadGroups();
  }, [groupMode, loadGroups]);

  useEffect(() => { setGroupPage(1); }, [search, sektor, distrik, status, dateFrom, dateTo]);

  function changeGroupPageSize(newSize) {
    const firstIndex = (groupPage - 1) * groupPageSize;
    const newPage = Math.floor(firstIndex / newSize) + 1;
    setGroupPageSize(newSize);
    setGroupPage(newPage);
  }

  const groupTotalPages = Math.max(1, Math.ceil(groupTotal / groupPageSize));
  
  const [sortBy, setSortBy] = useState(() => searchParams.get("sortBy") || "tanggal");
  const [sortDir, setSortDir] = useState(() => searchParams.get("sortDir") || "desc");

  function toggleSort(column) {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  useEffect(() => {
    fetch("/api/indikator")
      .then((res) => res.json())
      .then((json) => setDistrikList((json.distrik || []).map((d) => d.nama)));
  }, []);

  // Total keseluruhan (tanpa filter apa pun) — diambil sekali, terpisah dari
  // `total` (yang mengikuti filter aktif) supaya kartu "Total Data Fenomena"
  // tetap menampilkan angka penuh, tidak ikut berubah saat difilter.
  useEffect(() => {
    fetch("/api/fenomena?page=1&pageSize=1")
      .then((res) => res.json())
      .then((json) => setGrandTotal(json.total || 0));
  }, []);

  // Simpan filter ke URL — supaya tombol back browser kembali ke tampilan
  // dengan filter yang sama, bukan reset ke default.
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (sektor !== "Semua sektor") params.set("sektor", sektor);
    if (distrik !== "Semua distrik") params.set("distrik", distrik);
    if (status !== "Semua status") params.set("status", status);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 10) params.set("pageSize", String(pageSize));
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [search, sektor, distrik, status, dateFrom, dateTo, page, pageSize, pathname, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    if (sektor !== "Semua sektor") params.set("sektor", sektor);
    if (distrik !== "Semua distrik") params.set("distrik", distrik);
    if (status !== "Semua status") params.set("status", status);
    if (sortBy !== "tanggal") params.set("sortBy", sortBy);
    if (sortDir !== "desc") params.set("sortDir", sortDir);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const res = await fetch(`/api/fenomena?${params.toString()}`);
    const json = await res.json();
    setItems(json.data || []);
    setTotal(json.total || 0);
    setLoading(false);
  }, [page, pageSize, search, sektor, distrik, status, sortBy, sortDir, dateFrom, dateTo]);

  function refreshCurrentView() {
    if (groupMode) {
      loadGroups();
    } else {
      load();
    }
  }

  const prevFilterDeps = useRef({ search, sektor, distrik, status, sortBy, sortDir, dateFrom, dateTo });
  useEffect(() => {
    const prev = prevFilterDeps.current;
    const changed =
      prev.search !== search || prev.sektor !== sektor || prev.distrik !== distrik ||
      prev.status !== status || prev.sortBy !== sortBy || prev.sortDir !== sortDir ||
      prev.dateFrom !== dateFrom || prev.dateTo !== dateTo;
    prevFilterDeps.current = { search, sektor, distrik, status, sortBy, sortDir, dateFrom, dateTo };
    if (changed) setPage(1);
  }, [search, sektor, distrik, status, sortBy, sortDir, dateFrom, dateTo]);
  useEffect(() => { refreshCurrentView(); }, [load]);

  async function updateField(id, judul, field, value, label, displayValue) {
    const ok = await confirm({
      title: `Ubah ${label}?`,
      message: `"${judul}" akan diubah ${label}-nya menjadi "${displayValue ?? value}".`,
      confirmLabel: "Ya, ubah",
    });
    if (!ok) return;
    showLoading("Memperbarui data...");
    const res = await fetch(`/api/fenomena/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-neraca-pin": pin },
      body: JSON.stringify({ [field]: value }),
    });
    hideLoading();
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || `Gagal memperbarui data (status ${res.status}). Coba lagi.`);
      return;
    }
    await confirm({
      title: "Data diperbarui",
      message: `${label[0].toUpperCase()}${label.slice(1)} untuk "${judul}" berhasil diubah menjadi "${displayValue ?? value}" dan tersimpan di database.`,
      confirmLabel: "Mengerti",
      alertOnly: true,
    });
    refreshCurrentView();
  }

  async function removeItem(item) {
    const ok = await confirm({
      title: "Hapus fenomena?",
      message: `"${item.judul}" akan dihapus permanen dari sistem. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Ya, hapus",
      tone: "danger",
    });
    if (!ok) return;
    showLoading("Menghapus data...");
    const res = await fetch(`/api/fenomena/${item.id}`, {
      method: "DELETE",
      headers: { "x-neraca-pin": pin },
    });
    if (res.status === 409) {
      const j = await res.json();
      alert(j.error);
      return;
    }
    hideLoading();
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || `Gagal menghapus data (status ${res.status}). Coba lagi.`);
      return;
    }
    await confirm({
      title: "Data terhapus",
      message: `Fenomena "${item.judul}" telah berhasil dihapus dari database.`,
      confirmLabel: "Mengerti",
      alertOnly: true,
    });
    refreshCurrentView();
  }

  function changePageSize(newSize) {
    const firstItemIndex = (page - 1) * pageSize; // posisi item pertama yang lagi tampil
    const newPage = Math.floor(firstItemIndex / newSize) + 1;
    setPageSize(newSize);
    setPage(newPage);
  }

  const backUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="pt-8">
      <Link href="/" className="text-sm text-slate-soft mb-4 inline-block hover:text-ink">← Kembali ke Dashboard</Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Validasi Fenomena Tim Neraca</h1>
          <p className="text-sm text-slate-soft mt-1">Verifikasi status dan sentimen fenomena dari portal berita, media sosial, dan input hasil pendataan</p>
        </div>
        <button
          onClick={() => setShowPendataan(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-dark text-white text-sm font-semibold hover:bg-teal/90"
        >
          <Plus size={16} /> Tambah Fenomena
        </button>
      </div>

      <SinkronBox onDone={load} total={grandTotal} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-soft">
          {groupMode ? `${groupTotalFenomena} fenomena mirip ditemukan` : `${total} fenomena ditemukan`}
        </span>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2.5 mb-3">
          <Search size={16} className="text-slate-soft shrink-0" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari judul, lokasi, atau kata kunci fenomena..."
            className="bg-transparent outline-none text-sm w-full placeholder:text-slate-soft"
          />
        </div>

        <div className="mb-3">
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 tablet:gap-2 mb-3 tablet:mb-4">
          <button
            onClick={() => setGroupMode((v) => !v)}
            title="Kelompok Mirip"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 tablet:px-3 tablet:py-2 rounded-lg border text-xs tablet:text-sm font-semibold transition-colors shrink-0 ${
              groupMode ? "bg-gold/10 border-gold text-gold" : "border-line text-slate-soft hover:bg-bg"
            }`}
          >
            <Layers size={15} className="shrink-0" />
            <span className="hidden tablet:inline">Kelompok Mirip</span>
          </button>
          <SearchableSelect value={sektor} onChange={setSektor} options={["Semua sektor", ...SEKTOR_OPTIONS.slice(1)]} size="sm" className="flex-1 min-w-0" />
          <SearchableSelect
            value={distrik}
            onChange={setDistrik}
            options={["Semua distrik", ...distrikList]}
            size="sm"
            className="flex-1 min-w-0"
          />
          <SearchableSelect value={status} onChange={setStatus} options={["Semua status", ...STATUS_OPTIONS]} labels={{ Draft: "Tercatat" }} size="sm" className="flex-1 min-w-0" />
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] tablet:text-xs text-slate-soft">
              Tampilkan
              <select
                value={pageSize}
                onChange={(e) => changePageSize(parseInt(e.target.value, 10))}
                className="bg-white border border-line rounded-lg px-1.5 py-1 tablet:px-2 text-ink font-medium outline-none cursor-pointer"
              >
                {ROW_OPTIONS.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
              baris
            </div>
          </div>
        </div>

        {!groupMode ? (
          <>
            <div className="hidden tablet:grid tablet:grid-cols-[1fr_180px_110px_110px_44px] gap-4 px-1 pb-2 mb-1 border-b border-line">
              <SortableHeader label="Judul" column="judul" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortableHeader label="Sektor" column="sektor" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortableHeader label="Sentimen" column="sentimen" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortableHeader label="Status" column="status" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <span className="text-xs font-bold uppercase tracking-wide text-slate-soft">Aksi</span>
            </div>
            <div className={`divide-y divide-line transition-opacity duration-150 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
              {loading && !items.length && <p className="py-8 text-sm text-slate-soft text-center">Memuat...</p>}
              {!loading && !items.length && (
                <p className="py-8 text-sm text-slate-soft text-center">Tidak ada fenomena yang cocok dengan filter ini.</p>
              )}
              {items.map((item) => (
                <FenomenaRow key={item.id} item={item} sektorList={sektorList} onUpdateField={updateField} onRemove={removeItem} backUrl={backUrl} showLoading={showLoading} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-5">
                <button disabled={page <= 1} onClick={() => setPage(1)} title="Halaman pertama" className="w-8 h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors">
                  <ChevronsLeft size={16} />
                </button>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-slate-soft">Halaman {page} dari {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors">
                  <ChevronRight size={16} />
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} title="Halaman terakhir" className="w-8 h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors">
                  <ChevronsRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-slate-soft">{groupTotal} kelompok ditemukan</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-soft">
                Tampilkan
                <select
                  value={groupPageSize}
                  onChange={(e) => changeGroupPageSize(parseInt(e.target.value, 10))}
                  className="bg-white border border-line rounded-lg px-2 py-1 text-ink font-medium outline-none cursor-pointer"
                >
                  {[5, 10, 15].map((n) => (<option key={n} value={n}>{n}</option>))}
                </select>
                kelompok
              </div>
            </div>

            <div className={`space-y-3 transition-opacity duration-150 ${loadingGroups ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
              {loadingGroups && !groups.length && <p className="py-8 text-sm text-slate-soft text-center">Memuat kelompok...</p>}
              {!loadingGroups && !groups.length && (
                <p className="py-8 text-sm text-slate-soft text-center">Belum ada fenomena yang terindikasi mirip saat ini.</p>
              )}
              {groups.map((group, i) => (
                <div key={i} className="border border-gold/30 bg-amber-50/40 rounded-xl2 p-3">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Layers size={14} className="text-gold" />
                    <span className="text-xs font-bold text-gold uppercase tracking-wide">
                      Kelompok mirip · {group.members.length} fenomena · skor tertinggi {group.skorTertinggi}%
                    </span>
                  </div>
                  <div className="bg-white rounded-lg divide-y divide-line px-3">
                    {group.members.map((item) => (
                      <FenomenaRow key={item.id} item={item} sektorList={sektorList} onUpdateField={updateField} onRemove={removeItem} backUrl={backUrl} showLoading={showLoading} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {groupTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-5">
                <button disabled={groupPage <= 1} onClick={() => setGroupPage(1)} title="Halaman pertama" className="w-8 h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors">
                  <ChevronsLeft size={16} />
                </button>
                <button disabled={groupPage <= 1} onClick={() => setGroupPage((p) => p - 1)} className="w-8 h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-slate-soft">Halaman {groupPage} dari {groupTotalPages}</span>
                <button disabled={groupPage >= groupTotalPages} onClick={() => setGroupPage((p) => p + 1)} className="w-8 h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors">
                  <ChevronRight size={16} />
                </button>
                <button disabled={groupPage >= groupTotalPages} onClick={() => setGroupPage(groupTotalPages)} title="Halaman terakhir" className="w-8 h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors">
                  <ChevronsRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <PendataanModal open={showPendataan} onClose={() => setShowPendataan(false)} onSaved={load} />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

function ValidateSelect({ value, options, onChange, labels, className = "" }) {  
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={`w-full tablet:w-auto text-xs font-semibold bg-bg border border-line rounded-full px-3 py-1.5 outline-none cursor-pointer ${className}`}>
      {options.map((o) => (<option key={o} value={o}>{labels?.[o] || o}</option>))}
    </select>
  );
}

function SektorValidateSelect({ value, sektorList, onChange, className = "" }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? null : parseInt(raw, 10));
      }}
      className={`w-full tablet:w-auto tablet:max-w-[220px] text-xs font-semibold bg-bg border border-line rounded-full px-3 py-1.5 outline-none cursor-pointer truncate ${className}`}
    >
      <option value="">Belum ada sektor</option>
      {sektorList.map((s) => (
        <option key={s.id} value={s.id}>{s.nama}</option>
      ))}
    </select>
  );
}

function FenomenaRow({ item, sektorList, onUpdateField, onRemove, backUrl, showLoading }) {
  return (
    <div className="flex flex-col tablet:grid tablet:grid-cols-[1fr_180px_110px_110px_44px] tablet:items-center gap-2 tablet:gap-4 py-3.5">
      <Link
        href={`/fenomena/${item.id}?from=fenomena&back=${encodeURIComponent(backUrl)}`}
        onClick={() => showLoading?.("Membuka detail fenomena...")}
        className="min-w-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-semibold text-ink text-sm tablet:text-base truncate uppercase">{item.judul}</p>
          <span className="shrink-0"><MiripBadge skor={item.skorKemiripan} /></span>
         </div>
        <p className="text-xs text-slate-soft truncate">
          {item.distrik || "-"} · {formatDateTime(item.tanggal)} · {item.namaSumber || "-"}
        </p>
      </Link>

      <div className="tablet:contents" onClick={(e) => e.stopPropagation()}>
        <SektorValidateSelect
          value={item.sektorId}
          sektorList={sektorList}
          onChange={(v) => {
            const displayLabel = v === null ? "Belum ada sektor" : sektorList.find((s) => s.id === v)?.nama;
            onUpdateField(item.id, item.judul, "sektor_id", v, "sektor", displayLabel);
          }}
        />
      </div>
      <div className="flex items-center gap-2 tablet:contents" onClick={(e) => e.stopPropagation()}>
        <ValidateSelect
          value={item.sentimen}
          options={SENTIMEN_OPTIONS}
          onChange={(v) => onUpdateField(item.id, item.judul, "sentimen", v, "sentimen")}
          className="flex-1 tablet:flex-none"
        />
        <ValidateSelect
          value={item.status}
          options={STATUS_OPTIONS}
          labels={{ Draft: "Tercatat" }}
          onChange={(v) => onUpdateField(item.id, item.judul, "status", v, "status")}
          className="flex-1 tablet:flex-none"
        />
        <button
          onClick={() => onRemove(item)}
          title="Hapus fenomena ini"
          className="w-8 h-8 shrink-0 rounded-lg border border-line flex items-center justify-center text-coral hover:bg-coral/10 transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}