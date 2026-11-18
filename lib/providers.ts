"use client";
import { useSyncExternalStore } from "react";
import { META, PROVIDERS, type ProviderId } from "./providerMeta";
import type { Owner } from "./owner";
import { KEYS, parseJson, readLocal, useLocal, writeStore } from "./store";

// Appels directs navigateur → fournisseur, avec la clé déverrouillée en mémoire. Aucun serveur intermédiaire.

export type Req = { system: string; text: string; image?: { mediaType: string; data: string }; maxTokens: number };

export class ApiError extends Error {
  constructor(message: string, public status: number, public retryAfter?: number) { super(message); }
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<Record<string, any>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let r: Response;
  try {
    r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("réseau indisponible ou appel bloqué (CORS)", 0);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const ra = Number(r.headers.get("retry-after"));
    throw new ApiError(String(j?.error?.message ?? j?.message ?? `HTTP ${r.status}`), r.status, Number.isFinite(ra) && ra > 0 ? ra : undefined);
  }
  return j;
}

type Call = (key: string, model: string, r: Req) => Promise<string>;

const anthropic: Call = async (key, model, r) => {
  const content = [
    ...(r.image ? [{ type: "image", source: { type: "base64", media_type: r.image.mediaType, data: r.image.data } }] : []),
    { type: "text", text: r.text },
  ];
  const j = await post(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    { model, max_tokens: r.maxTokens, system: r.system, messages: [{ role: "user", content }] },
  );
  return (j.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
};

const google: Call = async (key, model, r) => {
  const j = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { "x-goog-api-key": key },
    {
      systemInstruction: { parts: [{ text: r.system }] },
      contents: [{ role: "user", parts: [...(r.image ? [{ inlineData: { mimeType: r.image.mediaType, data: r.image.data } }] : []), { text: r.text }] }],
      generationConfig: { maxOutputTokens: r.maxTokens },
    },
  );
  const parts = j.candidates?.[0]?.content?.parts as { text?: string }[] | undefined;
  if (!parts?.length) throw new ApiError(`réponse vide (${j.candidates?.[0]?.finishReason ?? j.promptFeedback?.blockReason ?? "inconnue"})`, 200);
  return parts.map((p) => p.text ?? "").join("");
};

// OpenAI, Groq, OpenRouter, Mistral : même format « chat completions ».
const compat = (url: string, maxField: "max_tokens" | "max_completion_tokens", extra: Record<string, string> = {}): Call => async (key, model, r) => {
  const user = r.image
    ? [{ type: "image_url", image_url: { url: `data:${r.image.mediaType};base64,${r.image.data}` } }, { type: "text", text: r.text }]
    : r.text;
  const j = await post(url, { Authorization: `Bearer ${key}`, ...extra }, {
    model,
    [maxField]: r.maxTokens,
    messages: [{ role: "system", content: r.system }, { role: "user", content: user }],
  });
  const out = j.choices?.[0]?.message?.content;
  if (typeof out !== "string" || !out) throw new ApiError("réponse vide", 200);
  return out;
};

const ADAPTERS: Record<ProviderId, Call> = {
  anthropic,
  google,
  openai: compat("https://api.openai.com/v1/chat/completions", "max_completion_tokens"),
  groq: compat("https://api.groq.com/openai/v1/chat/completions", "max_tokens"),
  openrouter: compat("https://openrouter.ai/api/v1/chat/completions", "max_tokens", { "X-Title": "Portfolio" }),
  mistral: compat("https://api.mistral.ai/v1/chat/completions", "max_tokens"),
};

// ───────── état : pauses et dernière réponse (non secret, en clair) ─────────

export type AiStatus = { cool: Partial<Record<ProviderId, { until: number; reason: string }>>; last?: { id: ProviderId; model: string; at: number } };
const readStatus = (): AiStatus => parseJson<AiStatus>(readLocal(KEYS.ai)) ?? { cool: {} };
const saveStatus = (s: AiStatus) => writeStore(KEYS.ai, JSON.stringify(s));
export const resetStatus = () => writeStore(KEYS.ai, null);

export const useAiStatus = (): AiStatus => {
  const raw = useLocal(KEYS.ai);
  return parseJson<AiStatus>(raw) ?? { cool: {} };
};

/** Heure courante arrondie à 30 s : évite d'appeler Date.now() pendant le rendu. */
export const useNow = () =>
  useSyncExternalStore(
    (cb) => { const t = setInterval(cb, 30_000); return () => clearInterval(t); },
    () => Math.floor(Date.now() / 30_000) * 30_000,
    () => 0,
  );

const QUOTA = /quota|rate.?limit|exhaust|credit|insufficient|billing|too many|resource_exhausted|capacity/i;

/** Classe l'erreur et renvoie la durée de pause (ms) + motif. */
function classify(e: ApiError): { ms: number; reason: string; quota: boolean } {
  const m = e.message.slice(0, 140);
  if (e.status === 401 || e.status === 403 || /api key not valid|invalid.*key|unauthorized/i.test(e.message))
    return { ms: 24 * 3600_000, reason: "clé refusée", quota: false };
  if (e.status === 402 || /credit|billing|insufficient/i.test(e.message))
    return { ms: 6 * 3600_000, reason: "crédit épuisé", quota: true };
  if (e.status === 429 || QUOTA.test(e.message))
    return { ms: Math.min(e.retryAfter ? e.retryAfter * 1000 : 5 * 60_000, 24 * 3600_000), reason: "limite atteinte", quota: true };
  if (e.status === 0) return { ms: 10 * 60_000, reason: m, quota: false };
  return { ms: 2 * 60_000, reason: m, quota: false };
}

function pause(id: ProviderId, e: ApiError) {
  const c = classify(e);
  const s = readStatus();
  saveStatus({ ...s, cool: { ...s.cool, [id]: { until: Date.now() + c.ms, reason: c.reason } } });
  return c;
}

export type Answer = { text: string; provider: ProviderId; model: string };

async function callOne(owner: Owner, id: ProviderId, r: Req): Promise<Answer> {
  const cfg = owner.providers.find((p) => p.id === id);
  const key = owner.keys[id];
  if (!cfg || !key) throw new ApiError("pas de clé", 0);
  const model = cfg.model || META[id].defaultModel;
  const text = (await ADAPTERS[id](key, model, r)).trim();
  const s = readStatus();
  const cool = { ...s.cool };
  delete cool[id];
  saveStatus({ cool, last: { id, model, at: Date.now() } });
  return { text, provider: id, model };
}

/** Test d'un seul fournisseur (bouton « Tester »). */
export async function testProvider(owner: Owner, id: ProviderId): Promise<Answer> {
  try {
    return await callOne(owner, id, { system: "Réponds uniquement par le mot OK.", text: "Test de connexion.", maxTokens: 20 });
  } catch (e) {
    if (e instanceof ApiError) pause(id, e);
    throw e;
  }
}

/** Envoie la requête au bon fournisseur : bascule automatique à l'épuisement, ou fournisseur choisi seulement. */
export async function ask(owner: Owner, r: Req): Promise<Answer> {
  const now = Date.now();
  const status = readStatus();
  const usable = (id: ProviderId) => !!owner.keys[id] && (!r.image || META[id].vision);

  let order: ProviderId[];
  if (owner.mode === "manual") order = [owner.selected];
  else order = owner.providers.filter((p) => p.enabled && usable(p.id) && !((status.cool[p.id]?.until ?? 0) > now)).map((p) => p.id);

  if (owner.mode === "manual" && !usable(owner.selected))
    throw new Error(r.image ? `${META[owner.selected].label} ne lit pas les images : choisis Gemini, Claude ou OpenAI.` : `Pas de clé pour ${META[owner.selected].label}.`);
  if (!order.length) {
    const paused = owner.providers.filter((p) => p.enabled && usable(p.id) && (status.cool[p.id]?.until ?? 0) > now).map((p) => `${META[p.id].label} (${status.cool[p.id]!.reason}, jusqu'à ${new Date(status.cool[p.id]!.until).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })})`);
    throw new Error(paused.length ? `Tous les fournisseurs sont en pause : ${paused.join(" ; ")}. Réessaie plus tard ou réinitialise les pauses dans /admin/.` : r.image ? "Aucun fournisseur actif ne lit les images (Gemini, Claude ou OpenAI avec clé)." : "Aucun fournisseur actif avec une clé : configure-en dans /admin/.");
  }

  const errors: string[] = [];
  for (const id of order) {
    try {
      return await callOne(owner, id, r);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(e instanceof Error ? e.message : String(e), 0);
      const c = pause(id, err);
      errors.push(`${META[id].label} : ${c.reason}${c.quota ? "" : ` (${err.message.slice(0, 100)})`}`);
      if (owner.mode === "manual") throw new Error(`${errors[0]}. Choisis un autre fournisseur, ou passe en mode automatique.`);
    }
  }
  throw new Error(`Tous les fournisseurs ont échoué → ${errors.join(" ; ")}`);
}

export { PROVIDERS, META };
