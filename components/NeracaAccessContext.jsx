"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const NeracaAccessContext = createContext(null);
const STORAGE_KEY = "simfoni_neraca_pin";

export function NeracaAccessProvider({ children }) {
  const [pin, setPin] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      const today = new Date().toDateString();
      if (saved.unlockedAt === today) {
        setPin(saved.pin);
      } else {
        // Beda hari -- sesi kemarin dianggap habis, minta PIN lagi.
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const unlock = useCallback(async (candidatePin) => {
    const res = await fetch("/api/auth/neraca", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: candidatePin }),
    });
    const json = await res.json();
    if (json.ok) {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pin: candidatePin, unlockedAt: new Date().toDateString() })
      );
      setPin(candidatePin);
      return true;
    }
    return false;
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setPin(null);
  }, []);

  return (
    <NeracaAccessContext.Provider value={{ pin, unlocked: !!pin, unlock, lock }}>
      {children}
    </NeracaAccessContext.Provider>
  );
}

export function useNeracaAccess() {
  const ctx = useContext(NeracaAccessContext);
  if (!ctx) throw new Error("useNeracaAccess harus dipakai di dalam NeracaAccessProvider");
  return ctx;
}