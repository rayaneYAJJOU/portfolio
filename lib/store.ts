"use client";
import { useSyncExternalStore } from "react";

// localStorage réactif, partagé entre composants (et sûr pour l'hydratation).
export const KEYS = {
  owner: "owner:v2", // réglages NON secrets (dépôt, ordre des fournisseurs, modèles)
  vault: "vault:v1", // secrets CHIFFRÉS (jeton GitHub, clés API)
  draft: "profile:draft:v1",
  cv: "cv-tailor:v1",
  offers: "cv-tailor:offers:v1",
  advice: "advice:v1",
  ai: "ai:status:v1",
} as const;

const EVT = "local-store-change";
const read = (key: string) => {
  try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
};
const subscribe = (cb: () => void) => {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener("storage", cb); };
};

export const notify = () => window.dispatchEvent(new Event(EVT));

/** Écrit (ou supprime si null) puis notifie les composants de l'onglet. */
export function writeStore(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  notify();
}

export const useLocal = (key: string) => useSyncExternalStore(subscribe, () => read(key), () => "");
export const readLocal = read;

export const parseJson = <T,>(raw: string): T | null => {
  try { return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
};
