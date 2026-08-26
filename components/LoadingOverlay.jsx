"use client";

export default function LoadingOverlay({ show, label = "Memproses..." }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-xl2 shadow-card px-8 py-7 flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-line border-t-teal-dark animate-spin" />
        <p className="text-sm font-semibold text-ink">{label}</p>
      </div>
    </div>
  );
}