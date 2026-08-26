"use client";

import { useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({ state, onCancel, onConfirm }) {
  if (!state?.open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-ink/40 modal-backdrop" onClick={onCancel} />
      <div className="relative bg-white rounded-xl2 shadow-card w-full max-w-sm p-6">
        <div className="w-10 h-10 rounded-full bg-amber-50 text-gold flex items-center justify-center mb-3">
          <AlertTriangle size={20} />
        </div>
        <h3 className="font-bold text-ink mb-1.5">{state.title || "Konfirmasi"}</h3>
        <p className="text-sm text-slate-soft mb-5">{state.message}</p>
        <div className="flex justify-end gap-2">
          {!state.alertOnly && (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-line text-sm font-semibold text-ink hover:bg-bg"
          >
            {state.cancelLabel || "Batal"}
          </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
              state.tone === "danger" ? "bg-coral hover:opacity-90" : "bg-ink hover:bg-teal-dark/90"
            }`}
          >
            {state.confirmLabel || "Ya, lanjutkan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook kecil agar pemakaian di halaman/komponen lain ringkas:
// const { confirm, dialogProps } = useConfirm();
// confirm({ title, message, tone }).then((yes) => { if (yes) doSomething(); });
export function useConfirm() {
  const [state, setState] = useState({ open: false });
  const [resolver, setResolver] = useState(null);

  const confirm = useCallback((opts) => {
    setState({ open: true, ...opts });
    return new Promise((resolve) => setResolver(() => resolve));
  }, []);

  const handleCancel = useCallback(() => {
    setState({ open: false });
    resolver?.(false);
  }, [resolver]);

  const handleConfirm = useCallback(() => {
    setState({ open: false });
    resolver?.(true);
  }, [resolver]);

  return {
    confirm,
    dialogProps: { state, onCancel: handleCancel, onConfirm: handleConfirm },
  };
}
