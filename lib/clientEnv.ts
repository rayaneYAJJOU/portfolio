"use client";
import { useSyncExternalStore } from "react";

// Lecture sûre (SSR / hydratation) de valeurs qui n'existent que dans le navigateur.
const noop = () => () => {};

export const useSearch = () => useSyncExternalStore(noop, () => window.location.search, () => "");
export const useNavigatorLang = () => useSyncExternalStore(noop, () => navigator.language ?? "", () => "");
export const useStored = (key: string) =>
  useSyncExternalStore(
    noop,
    () => {
      try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
    },
    () => "",
  );
