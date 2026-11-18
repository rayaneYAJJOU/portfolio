"use client";
import { useMemo } from "react";
import { content, type Lang, type Profile } from "../app/content";
import { PROVIDERS, type ProviderId } from "./providerMeta";
import { KEYS, parseJson, useLocal } from "./store";
import { useVault } from "./vault";

export { KEYS, notify, useLocal, writeStore } from "./store";

export type Data = Record<Lang, Profile>;

export type ProviderCfg = { id: ProviderId; model: string; enabled: boolean };
/** Réglages non secrets, stockés en clair. */
export type Settings = { repo: string; branch: string; mode: "auto" | "manual"; selected: ProviderId; providers: ProviderCfg[] };
/** Propriétaire déverrouillé : réglages + secrets (en mémoire seulement). */
export type Owner = Settings & { ghToken: string; keys: Record<string, string> };

export const defaultSettings = (repo = "", branch = "main"): Settings => ({
  repo,
  branch,
  mode: "auto",
  selected: PROVIDERS[0].id,
  providers: PROVIDERS.map((p) => ({ id: p.id, model: p.defaultModel, enabled: false })),
});

/** Complète d'éventuels fournisseurs manquants (nouvelles versions). */
function normalize(s: Settings): Settings {
  const have = new Set(s.providers.map((p) => p.id));
  const extra = PROVIDERS.filter((p) => !have.has(p.id)).map((p) => ({ id: p.id, model: p.defaultModel, enabled: false }));
  return { ...s, providers: [...s.providers, ...extra] };
}

export function useSettings(): Settings | null {
  const raw = useLocal(KEYS.owner);
  return useMemo(() => {
    const s = parseJson<Settings>(raw);
    return s ? normalize(s) : null;
  }, [raw]);
}

export function useOwner(): Owner | null {
  const settings = useSettings();
  const { state, secrets } = useVault();
  return useMemo(() => (state === "unlocked" && settings && secrets ? { ...settings, ghToken: secrets.ghToken, keys: secrets.keys } : null), [state, settings, secrets]);
}

export function useDraft(): Data | null {
  const raw = useLocal(KEYS.draft);
  return useMemo(() => parseJson<Data>(raw), [raw]);
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
