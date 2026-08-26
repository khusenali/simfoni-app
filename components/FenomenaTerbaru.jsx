"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useGlobalLoading } from "./GlobalLoadingContext";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { SentimenBadge, StatusBadge, MiripBadge } from "./Badges";
import { formatDateTime } from "../lib/format";
import { useNeracaAccess } from "./NeracaAccessContext";
import NeracaUnlockModal from "./NeracaUnlockModal";
import SearchableSelect from "./SearchableSelect";
import SortableHeader from "./SortableHeader";

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
  "M. Jasa Perusahaan",
  "N. Administrasi Pemerintah, Pertahanan dan Jaminan Sosial Wajib",
  "O. Jasa Pendidikan",
  "P. Jasa Kesehatan dan Kegiatan Sosial",
  "Q. Jasa Lainnya",
];
const STATUS_OPTIONS = ["Semua status", "Draft", "Terverifikasi"];
const ROW_OPTIONS = [5, 8, 10, 15, 20];

export default function FenomenaTerbaru({ dateFrom, dateTo }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showLoading } = useGlobalLoading();
  const isFirst = useRef(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(() => parseInt(searchParams.get("fPage") || "1", 10));
  const [pageSize, setPageSize] = useState(8);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sektor, setSektor] = useState("Semua sektor");
  const [distrik, setDistrik] = useState("Semua distrik");
  const [distrikList, setDistrikList] = useState([]);
  const [status, setStatus] = useState("Semua status");
  const [sortBy, setSortBy] = useState("tanggal");
  const [sortDir, setSortDir] = useState("desc");
  const [showUnlock, setShowUnlock] = useState(false);
  const { unlocked } = useNeracaAccess();
  const router = useRouter();

  function toggleSort(column) {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  // Simpan halaman widget ini ke URL (param `fPage`) -- supaya kalau user
  // buka detail fenomena lalu klik kembali, dashboard tetap di halaman
  // yang sama, bukan reset ke halaman 1.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) params.set("fPage", String(page));
    else params.delete("fPage");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [page]);

  // Debounce cuma buat teks yang diketik -- klik pagination/sortir/filter/
  // ganti jumlah baris harus langsung tanpa jeda buatan.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetch("/api/indikator")
      .then((res) => res.json())
      .then((json) => setDistrikList((json.distrik || []).map((d) => d.nama)));
  }, []);

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
  }, [page, pageSize, search, sektor, distrik, status, dateFrom, sortBy, sortDir, dateTo]);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setPage(1);
  }, [search, sektor, distrik, status, sortBy, sortDir, dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);

  function changePageSize(newSize) {
    const firstItemIndex = (page - 1) * pageSize;
    const newPage = Math.floor(firstItemIndex / newSize) + 1;
    setPageSize(newSize);
    setPage(newPage);
  }

  function goToFenomena() {
    if (unlocked) router.push("/fenomena");
    else setShowUnlock(true);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <>
    <div className="card p-4 tablet:p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-ink text-sm tablet:text-base">Fenomena Terbaru</h3>
        <button onClick={goToFenomena} className="text-xs tablet:text-sm font-semibold text-teal hover:underline shrink-0">
          Lihat semua ↗
        </button>
      </div>
      <p className="text-[11px] tablet:text-xs text-slate-soft mb-3 tablet:mb-4">Ringkasan fenomena terbaru</p>

      <div className="flex items-center gap-2 bg-bg rounded-lg px-2.5 py-2 tablet:px-3 tablet:py-2.5 mb-2.5 tablet:mb-3">
        <Search className="w-3.5 h-3.5 tablet:w-4 tablet:h-4 text-slate-soft shrink-0" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari judul, lokasi, atau kata kunci fenomena..."
          className="bg-transparent outline-none text-xs tablet:text-sm w-full placeholder:text-slate-soft"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 tablet:gap-2 mb-3 tablet:mb-4">
        <SearchableSelect value={sektor} onChange={setSektor} options={SEKTOR_OPTIONS} size="sm" className="flex-1 min-w-0" />
         <SearchableSelect
          value={distrik}
          onChange={setDistrik}
          options={["Semua distrik", ...distrikList]}
          size="sm"
          className="flex-1 min-w-0"
        />
        <SearchableSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} labels={{ Draft: "Tercatat" }} size="sm" className="flex-1 min-w-0" />
        <div className="ml-auto flex items-center gap-1 tablet:gap-1.5 text-[11px] tablet:text-xs text-slate-soft">
          Tampilkan
          <select
            value={pageSize}
            onChange={(e) => changePageSize(parseInt(e.target.value, 10))}
            className="bg-white border border-line rounded-lg px-1.5 py-1 tablet:px-2 tablet:py-1 text-ink font-medium outline-none cursor-pointer"
          >
            {ROW_OPTIONS.map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
          baris
        </div>
      </div>

      <div className="flex items-center justify-between px-1 pb-1.5 mb-1 border-b border-line">
        <SortableHeader label="Judul" column="judul" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
        <div className="flex items-center gap-3 tablet:gap-4 shrink-0">
          <SortableHeader label="Sentimen" column="sentimen" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
          <SortableHeader label="Status" column="status" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
        </div>
      </div>

      <div className={`divide-y divide-line transition-opacity duration-150 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
        {loading && !items.length && <p className="py-6 text-xs tablet:text-sm text-slate-soft text-center">Memuat...</p>}
        {!loading && !items.length && (
          <p className="py-6 text-xs tablet:text-sm text-slate-soft text-center">Belum ada fenomena yang cocok dengan filter ini.</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2.5 tablet:py-3.5 gap-2 tablet:gap-4">
            <Link
              href={`/fenomena/${item.id}?from=dashboard&back=${encodeURIComponent(`${pathname}${page > 1 ? `?fPage=${page}` : ""}`)}`}
              onClick={() => showLoading("Membuka detail fenomena...")}
              className="min-w-0 flex-1"
            >
              <div className="flex items-center gap-1.5 tablet:gap-2 min-w-0">
                <p className="font-semibold text-ink text-xs tablet:text-sm truncate uppercase">{item.judul}</p>
                <MiripBadge skor={item.skorKemiripan} />
              </div>
              <p className="text-[10px] tablet:text-xs text-slate-soft truncate">
                {item.sektor || "Belum ada sektor"} · {formatDateTime(item.tanggal)} · {item.namaSumber || "-"}
              </p>
            </Link>
            <div className="flex items-center gap-1.5 tablet:gap-2 shrink-0">
              <SentimenBadge value={item.sentimen} />
              <StatusBadge value={item.status} />
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 tablet:gap-3 mt-3 tablet:mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(1)}
            title="Halaman pertama"
            className="w-7 h-7 tablet:w-8 tablet:h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors"
          >
            <ChevronsLeft className="w-3.5 h-3.5 tablet:w-4 tablet:h-4" />
          </button>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="w-7 h-7 tablet:w-8 tablet:h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 tablet:w-4 tablet:h-4" />
          </button>
          <span className="text-[11px] tablet:text-xs text-slate-soft">Halaman {page} dari {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="w-7 h-7 tablet:w-8 tablet:h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 tablet:w-4 tablet:h-4" />
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
            title="Halaman terakhir"
            className="w-7 h-7 tablet:w-8 tablet:h-8 rounded-full border border-line flex items-center justify-center disabled:opacity-40 hover:bg-bg transition-colors"
          >
            <ChevronsRight className="w-3.5 h-3.5 tablet:w-4 tablet:h-4" />
          </button>
        </div>
      )}

    </div>
    <NeracaUnlockModal open={showUnlock} onClose={() => setShowUnlock(false)} onUnlocked={() => router.push("/fenomena")} />
    </>
  );
}