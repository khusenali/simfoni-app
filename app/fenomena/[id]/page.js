"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { SentimenBadge, StatusBadge } from "../../../components/Badges";
import { ConfirmDialog, useConfirm } from "../../../components/ConfirmDialog";
import NeracaUnlockModal from "../../../components/NeracaUnlockModal";
import { formatDateLong } from "../../../lib/format";
import { useNeracaAccess } from "../../../components/NeracaAccessContext";
import { useGlobalLoading } from "../../../components/GlobalLoadingContext";

export default function FenomenaDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [item, setItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showUnlock, setShowUnlock] = useState(false);
  const { confirm, dialogProps } = useConfirm();
  const { unlocked, pin } = useNeracaAccess();
  const { hideLoading } = useGlobalLoading();
  const from = searchParams.get("from");
  const backParam = searchParams.get("back");
  const backHref = backParam ? decodeURIComponent(backParam) : from === "dashboard" ? "/" : "/fenomena";
  const backLabel = backParam
    ? "Kembali ke fenomena sebelumnya"
    : from === "dashboard" ? "Kembali ke Dashboard" : "Kembali ke daftar fenomena";

  // URL halaman ini sendiri (berikut rantai `back` yang mungkin sudah
  // dibawa dari sebelumnya) -- jadi tujuan kembali kalau user buka
  // link fenomena mirip di bawah.
  const selfUrlWithQuery = `/fenomena/${id}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`; 

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch(`/api/fenomena/${id}`);
      const f = await res.json();
      if (active) setItem(f);
      hideLoading();
    })();
    return () => {
      active = false;
      hideLoading(); // jaga-jaga kalau user pindah halaman sebelum fetch selesai, biar overlay gak nyangkut
    };
  }, [id]);

  async function updateStatus(status) {
    const ok = await confirm({
      title: "Ubah status validasi?",
      message: `Status fenomena ini akan diubah menjadi "${status}".`,
      confirmLabel: "Ya, ubah",
    });
    if (!ok) return;
    setSaving(true);
    const res = await fetch(`/api/fenomena/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-neraca-pin": pin },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setItem(updated);
    setSaving(false);
  }

  async function remove() {
    setError("");
    const ok = await confirm({
      title: "Hapus fenomena?",
      message: "Data ini akan dihapus permanen dari sistem. Tindakan ini tidak dapat dibatalkan.",
      confirmLabel: "Ya, hapus",
      tone: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/fenomena/${id}`, {
      method: "DELETE",
      headers: { "x-neraca-pin": pin },
    });
    if (res.status === 409) {
      const j = await res.json();
      setError(j.error);
      return;
    }
    if (!res.ok) {
      setError("Gagal menghapus data. Coba lagi.");
      return;
    }
    // Popup muncul HANYA setelah server konfirmasi data benar-benar
    // terhapus dari database (res.ok) -- bukan optimis di sisi client.
    await confirm({
      title: "Data terhapus",
      message: `Fenomena "${item.judul}" telah berhasil dihapus dari database.`,
      confirmLabel: "Mengerti",
      alertOnly: true,
    });
    router.push("/fenomena");
  }

  if (!item) {
  return <div className="pt-8 text-sm text-slate-soft">Memuat...</div>;
  }
  
  return (
    <div className="pt-8 max-w-7xl mx-auto">
      <Link href={backHref} className="flex items-center gap-1.5 text-sm text-slate-soft mb-5 hover:text-ink">
        <ArrowLeft size={16} /> {backLabel}
      </Link>

      <div className="card p-6 mb-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-xl font-extrabold text-ink uppercase">{item.judul}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <SentimenBadge value={item.sentimen} />
            <StatusBadge value={item.status} />
          </div>
        </div>

        {error && (
          <p className="text-sm text-coral bg-coral/10 rounded-lg px-4 py-2.5 mb-4">{error}</p>
        )}

        <p className="text-sm text-slate-soft mb-5">
          {formatDateLong(item.tanggal)} · {item.sektor || "Belum ada sektor"} · {item.distrik || "-"} · {item.namaSumber || "-"}
        </p>
        
        {item.miripDenganId && (
          <div className="flex items-center gap-2 bg-amber-50 text-gold text-sm font-medium rounded-lg px-4 py-3 mb-4">
            ⚠ Fenomena ini terindikasi mirip ({item.skorKemiripan}%) dengan{" "}
            <Link
              href={`/fenomena/${item.miripDenganId}?back=${encodeURIComponent(selfUrlWithQuery)}`}
              className="underline font-semibold"
            >
              fenomena #{item.miripDenganId}
            </Link>.
            Periksa kembali sebelum diverifikasi.
          </div>
        )}
        {item.uraian && (
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase text-slate-soft mb-1">Uraian</h3>
            <p className="text-sm text-ink leading-relaxed">{item.uraian}</p>
          </div>
        )}
        {item.penyebab && (
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase text-slate-soft mb-1">Penyebab</h3>
            <p className="text-sm text-ink leading-relaxed">{item.penyebab}</p>
          </div>
        )}
        {item.dampak && (
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase text-slate-soft mb-1">Dampak</h3>
            <p className="text-sm text-ink leading-relaxed">{item.dampak}</p>
          </div>
        )}
        {!!item.keyword?.length && (
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase text-slate-soft mb-2">Kata kunci</h3>
            <div className="flex flex-wrap gap-1.5">
              {item.keyword.map((k) => (
                <span key={k} className="badge bg-bg text-slate-soft">{k}</span>
              ))}
            </div>
          </div>
        )}
        {item.url && (
          <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-teal font-semibold hover:underline">
            Buka sumber asli <ExternalLink size={14} />
          </a>
        )}
      </div>

      <div className="card p-6 mb-5">
        <h3 className="font-bold text-ink mb-3">Validasi Fenomena</h3>
        <p className="text-sm text-slate-soft mb-4">
          Status awal setiap fenomena adalah Draft. Tim Neraca dapat memverifikasi atau menandai fenomena
          sebagai bukti berita sudah valid dan sesuai kondisi lapangan.
        </p>
        {unlocked ? (
          <div className="flex gap-2">
            {["Draft", "Terverifikasi"].map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={saving || item.status === s}
                className="px-4 py-2 rounded-lg border font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-soft">Perlu akses Tim Neraca untuk mengubah status. <button onClick={() => setShowUnlock(true)} className="underline font-semibold">Buka dengan PIN</button></p>
        )}
      </div>

      <div className="card p-6 mb-5 border-coral/20">
        <h3 className="font-bold text-ink mb-3">Hapus Fenomena</h3>
        <p className="text-sm text-slate-soft mb-4">
          Menghapus fenomena akan menghilangkan data ini secara permanen dari sistem. Tindakan ini tidak dapat dibatalkan, dan hanya bisa dilakukan oleh Tim Neraca.
        </p>
        {unlocked ? (
          <button
            onClick={remove}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-coral text-white font-semibold text-sm hover:opacity-90"
          >
            <Trash2 size={15} /> Hapus fenomena ini
          </button>
        ) : (
          <p className="text-sm text-slate-soft">Perlu akses Tim Neraca untuk menghapus fenomena. <button onClick={() => setShowUnlock(true)} className="underline font-semibold">Buka dengan PIN</button></p>
        )}
      </div>
      <ConfirmDialog {...dialogProps} />
      <NeracaUnlockModal open={showUnlock} onClose={() => setShowUnlock(false)} />
    </div>
  );
}