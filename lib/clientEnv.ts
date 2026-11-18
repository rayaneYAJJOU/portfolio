"use client";
import { useSyncExternalStore } from "react";

// Lecture sûre (SSR / hydratation) de valeurs qui n'existent que dans le navigateur.
const noop = () => () => {};

export const useSearch = () => useSyncExternalStore(noop, () => window.location.search, () => "");
export const useHash = () =>
  useSyncExternalStore(
    (cb) => { window.addEventListener("hashchange", cb); window.addEventListener("local-store-change", cb); return () => { window.removeEventListener("hashchange", cb); window.removeEventListener("local-store-change", cb); }; },
    () => window.location.hash,
    () => "",
  );
/** false pendant le rendu serveur et l'hydratation, true ensuite. */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);
export const useNavigatorLang = () => useSyncExternalStore(noop, () => navigator.language ?? "", () => "");
export const useStored = (key: string) =>
  useSyncExternalStore(
    noop,
    () => {
      try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
    },
    () => "",
  );
