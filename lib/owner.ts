"use client";
import { useMemo, useSyncExternalStore } from "react";
import { content, type Lang, type Profile } from "../app/content";

// Mode propriétaire = un jeton GitHub (et, en option, une clé IA) présents dans CE navigateur.
// Rien de tout cela n'est dans le code publié : un visiteur n'a ni jeton ni clé, donc aucun pouvoir.

export type OwnerSettings = { repo: string; branch: string; ghToken: string; aiKey: string; model: string };
export type Data = Record<Lang, Profile>;

export const KEYS = {
  owner: "owner:v1",
  draft: "profile:draft:v1",
  cv: "cv-tailor:v1",
  offers: "cv-tailor:offers:v1",
  advice: "advice:v1",
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

/** Écrit (ou supprime si null) puis notifie tous les composants de l'onglet. */
export function writeStore(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

/** Valeur brute d'une clé localStorage ("" côté serveur et pendant l'hydratation). */
export const useLocal = (key: string) => useSyncExternalStore(subscribe, () => read(key), () => "");

const parse = <T,>(raw: string): T | null => {
  try { return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
};

export function useOwner(): OwnerSettings | null {
  const raw = useLocal(KEYS.owner);
  return useMemo(() => {
    const s = parse<OwnerSettings>(raw);
    return s?.ghToken && s.repo ? s : null;
  }, [raw]);
}

export function useDraft(): Data | null {
  const raw = useLocal(KEYS.draft);
  return useMemo(() => parse<Data>(raw), [raw]);
}

/** Profil à afficher : le publié pour tout le monde ; le brouillon en plus pour le propriétaire. */
export function useProfile() {
  const owner = useOwner();
  const draft = useDraft();
  return useMemo(() => {
    const isDraft = !!owner && !!draft && JSON.stringify(draft) !== JSON.stringify(content);
    return { owner, data: (isDraft ? draft : content) as Data, isDraft };
  }, [owner, draft]);
}
