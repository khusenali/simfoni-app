"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import Modal from "./Modal";
import { useNeracaAccess } from "./NeracaAccessContext";
import { useGlobalLoading } from "./GlobalLoadingContext";

export default function NeracaUnlockModal({ open, onClose, onUnlocked }) {
  const { unlock } = useNeracaAccess();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const { showLoading, hideLoading } = useGlobalLoading();

  function handlePinChange(raw) {
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    setError(digitsOnly !== raw ? "PIN hanya boleh berisi angka (0-9)." : "");
    setPin(digitsOnly);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    showLoading("Memeriksa PIN...");
    const ok = await unlock(pin);
    setLoading(false);
    hideLoading();
    if (!ok) {
      setError("PIN salah. Coba lagi atau hubungi Tim Neraca.");
      return;
    }
    setPin("");
    onClose();
    onUnlocked?.();
  }

  return (
    <Modal open={open} onClose={onClose} title="Akses Tim Neraca" subtitle="Masukkan PIN untuk membuka fitur validasi fenomena" width="max-w-sm">
      <form onSubmit={submit} className="space-y-4">
        <div className="relative">
          <input
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            placeholder="Masukkan PIN"
            className="input text-center tracking-widest text-lg pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPin((v) => !v)}
            tabIndex={-1}
            aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-soft hover:text-ink"
          >
            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && <p className="text-sm text-coral">{error}</p>}
        <button
          type="submit"
          disabled={loading || !pin}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-dark text-white text-sm font-semibold hover:bg-teal-dark/90 disabled:opacity-60"
        >
          <Lock size={15} /> {loading ? "Memeriksa..." : "Buka Akses"}
        </button>
      </form>
    </Modal>
  );
}