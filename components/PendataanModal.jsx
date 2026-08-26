"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Upload, FileSpreadsheet, Download } from "lucide-react";
import Modal from "./Modal";
import { ConfirmDialog, useConfirm } from "./ConfirmDialog";
import SearchableSelect from "./SearchableSelect";


const emptyForm = {
  judul: "", tanggal: "", uraian: "", penyebab: "", dampak: "",
  sektor: "", distrik: "", namaSumber: "", penulis: "",
};

function isTanggalDalamRentang(tanggalStr) {
  if (!tanggalStr) return true; // required attr sudah menjaga wajib isi
  const tahun = new Date(`${tanggalStr}T00:00:00Z`).getUTCFullYear();
  const tahunSekarang = new Date().getFullYear();
  return tahun >= tahunSekarang - 1 && tahun <= tahunSekarang;
}

export default function PendataanModal({ open, onClose, onSaved }) {
  const [tab, setTab] = useState("form"); // form | import
  const [form, setForm] = useState(emptyForm);
  const [sektorOptions, setSektorOptions] = useState([]);
  const [distrikOptions, setDistrikOptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const { confirm, dialogProps } = useConfirm();

  useEffect(() => {
    if (!open) return;
    (async () => {
      const res = await fetch("/api/indikator");
      const json = await res.json();
      setSektorOptions(json.sektor.map((s) => s.nama));
      setDistrikOptions(json.distrik.map((d) => d.nama));
    })();
  }, [open]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.sektor || !form.distrik) {
        setError("Sektor dan Distrik wajib dipilih.");
        return;
      }
    if (!form.penulis) {
      setError("Nama Petugas / Tim wajib diisi.");
      return;
    }
    if (!isTanggalDalamRentang(form.tanggal)) {
      const tahunSekarang = new Date().getFullYear();
      await confirm({
        title: "Tanggal di luar rentang yang diizinkan",
        message: `Tanggal kejadian hanya boleh antara tahun ${tahunSekarang - 1} dan ${tahunSekarang}. Ubah tanggal kejadian sebelum menyimpan.`,
        confirmLabel: "Mengerti",
        alertOnly: true,
        tone: "danger",
      });
      return;
    }
    const ok = await confirm({
      title: "Simpan data fenomena?",
      message: `Fenomena "${form.judul || "(tanpa judul)"}" akan disimpan dengan status Draft dan menunggu validasi Tim Neraca.`,
      confirmLabel: "Ya, simpan",
    });
    if (!ok) return;

    setSubmitting(true);
    const payload = {
      ...form,
      tanggal: form.tanggal ? new Date(`${form.tanggal}T00:00:00Z`).toISOString() : form.tanggal,
    };
    const res = await fetch("/api/fenomena", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(json.error || "Gagal menyimpan data.");
      return;
    }
    setSuccess(true);
    setForm(emptyForm);
    onSaved?.();
    setTimeout(() => setSuccess(false), 3000);
  }

  async function submitImport() {
    if (!file) return;
    const ok = await confirm({
      title: "Import data dari Excel?",
      message: `File "${file.name}" akan diproses dan setiap baris yang valid disimpan sebagai fenomena berstatus Draft.`,
      confirmLabel: "Ya, import",
    });
    if (!ok) return;

    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/fenomena/import", { method: "POST", body: fd });
      const json = await res.json();
      setImportResult(json);
      if (res.ok) {
        onSaved?.();
      } else if (json.code === "HEADER_MISMATCH") {
        await confirm({
          title: "Format file tidak sesuai template",
          message: `${json.error}\n\nUrutan kolom yang benar: ${json.expected.join(", ")}.`,
          confirmLabel: "Mengerti",
          alertOnly: true,
          tone: "danger",
        });
      }
    } catch (err) {
      setImportResult({ error: err.message });
    }
    setImporting(false);
  }

  function handleClose() {
    setForm(emptyForm);
    setFile(null);
    setImportResult(null);
    setError("");
    setTab("form");
    onClose();
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title="Tambah Fenomena"
        subtitle="Masukkan hasil observasi lapangan secara manual atau import banyak data sekaligus dari Excel"
        width="max-w-2xl"
      >
        <div className="flex items-center gap-2 mb-5">
          <TabButton active={tab === "form"} onClick={() => setTab("form")}>Formulir Manual</TabButton>
          <TabButton active={tab === "import"} onClick={() => setTab("import")}>Import Excel</TabButton>
        </div>

        {tab === "form" && (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Judul Fenomena" required>
              <input
                required value={form.judul} onChange={(e) => update("judul", e.target.value)}
                className="input" placeholder="Contoh: Wisatawan Raja Ampat meningkat 20%"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Tanggal Kejadian" required>
                <input
                  required type="date" value={form.tanggal} onChange={(e) => update("tanggal", e.target.value)}
                  min={`${new Date().getFullYear() - 1}-01-01`}
                  max={`${new Date().getFullYear()}-12-31`}
                  className="input"
                 />
              </Field>
              <Field label="Nama Petugas / Tim" required>
                 <input
                  required value={form.penulis} onChange={(e) => update("penulis", e.target.value)}
                  className="input" placeholder="Contoh: Tim Distribusi"
                 />
              </Field>
            </div>

            <Field label="Uraian" required>
              <textarea
                required rows={3} value={form.uraian} onChange={(e) => update("uraian", e.target.value)}
                className="input" placeholder="Jelaskan fenomena yang diamati..."
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Penyebab">
                <textarea rows={2} value={form.penyebab} onChange={(e) => update("penyebab", e.target.value)} className="input" />
              </Field>
              <Field label="Dampak">
                <textarea rows={2} value={form.dampak} onChange={(e) => update("dampak", e.target.value)} className="input" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Sektor PDRB" required>
                <SearchableSelect
                  value={form.sektor}
                  onChange={(v) => update("sektor", v)}
                  options={sektorOptions}
                  placeholder="Pilih sektor"
                />
              </Field>
              <Field label="Distrik / Lokasi" required>
                <SearchableSelect
                  value={form.distrik}
                  onChange={(v) => update("distrik", v)}
                  options={distrikOptions}
                  placeholder="Pilih distrik"
                />
              </Field>
            </div>

            {error && <p className="text-sm text-coral">{error}</p>}
            {success && (
              <p className="flex items-center gap-1.5 text-sm text-teal font-semibold">
                <CheckCircle2 size={16} /> Data tersimpan sebagai Draft.
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit" disabled={submitting}
                className="px-5 py-2.5 rounded-lg bg-teal-dark text-white text-sm font-semibold hover:bg-teal-dark/90 disabled:opacity-60"
              >
                {submitting ? "Menyimpan..." : "Simpan Fenomena"}
              </button>
              <button
                type="button" onClick={handleClose}
                className="px-5 py-2.5 rounded-lg border border-line text-sm font-semibold text-ink hover:bg-bg"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {tab === "import" && (
        <div>
          <a
            href="/api/fenomena/import/template"
            className="flex items-center gap-1.5 text-sm text-teal font-semibold hover:underline mb-3"
          >
            <Download size={14} /> Unduh Template Excel
          </a>

          <div className="rounded-xl border-2 border-dashed border-line p-6 text-center mb-4">
            <FileSpreadsheet size={28} className="mx-auto text-teal mb-2" />
            <p className="text-sm text-ink font-semibold mb-1">Pilih file Excel (.xlsx)</p>
            <p className="text-xs text-slate-soft mb-3">
              Kolom & urutan judul kolom harus persis sama seperti template: Judul, Tanggal, Uraian, Sektor, Distrik, Penyebab, Dampak, Petugas.
              Tanggal kejadian hanya diterima untuk tahun {new Date().getFullYear() - 1}-{new Date().getFullYear()}.
            </p>
            <input
              type="file" accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm mx-auto"
            />
          </div>

          {file && <p className="text-sm text-ink mb-3">File dipilih: <span className="font-semibold">{file.name}</span></p>}

          {importResult && !importResult.error && (
            <p className="text-sm text-teal font-semibold mb-3">
              Berhasil: {importResult.inserted} baris ditambahkan, {importResult.skipped} baris dilewati.
              {importResult.contohDiabaikan > 0 && ` ${importResult.contohDiabaikan} baris contoh diabaikan.`}
              {importResult.diluarRentangTahun > 0 && ` ${importResult.diluarRentangTahun} baris diluar rentang tahun.`}
            </p>
          )}
          {importResult?.error && (
            <p className="text-sm text-coral mb-3">Gagal: {importResult.error}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={submitImport}
              disabled={!file || importing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-dark text-white text-sm font-semibold hover:bg-teal-dark/90 disabled:opacity-60"
            >
              <Upload size={16} /> {importing ? "Mengimpor..." : "Import Data"}
            </button>
            <button
              type="button" onClick={handleClose}
              className="px-5 py-2.5 rounded-lg border border-line text-sm font-semibold text-ink hover:bg-bg"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
      </Modal>
      <ConfirmDialog {...dialogProps} />
    </>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
        active ? "bg-teal-dark text-white border-teal-dark" : "text-slate-soft border-line hover:bg-bg"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink mb-1.5 block">
        {label} {required && <span className="text-coral">*</span>}
      </span>
      {children}
    </label>
  );
}