"use client";

import { createContext, useContext, useState, useCallback } from "react";
import LoadingOverlay from "./LoadingOverlay";

const GlobalLoadingContext = createContext(null);

export function GlobalLoadingProvider({ children }) {
  const [state, setState] = useState({ show: false, label: "Memproses..." });

  const showLoading = useCallback((label) => {
    setState({ show: true, label: label || "Memproses..." });
  }, []);
  const hideLoading = useCallback(() => {
    setState((s) => ({ ...s, show: false }));
  }, []);

  // Bungkus fungsi async apa pun: overlay nyala sebelum jalan, mati lagi
  // setelah selesai -- sukses maupun gagal (pakai finally).
  const runWithLoading = useCallback(async (fn, label) => {
    showLoading(label);
    try {
      return await fn();
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]);

  return (
    <GlobalLoadingContext.Provider value={{ showLoading, hideLoading, runWithLoading }}>
      {children}
      <LoadingOverlay show={state.show} label={state.label} />
    </GlobalLoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  const ctx = useContext(GlobalLoadingContext);
  if (!ctx) throw new Error("useGlobalLoading harus dipakai di dalam GlobalLoadingProvider");
  return ctx;
}