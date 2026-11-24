import { cvToText } from "./cvText";
import type { Data, Owner } from "./owner";
import { promptText } from "./prompts";
import { ask, type Req } from "./providers";
import type { CV, Report } from "./tailor";

// Les appels passent par lib/providers.ts : fournisseur choisi, ou bascule automatique quand un quota est épuisé.
// Les clés ne sont jamais dans le code : elles sont déverrouillées en mémoire par ta phrase secrète.

const run = async (o: Owner, r: Req) => (await ask(o, r)).text;

function json<T>(text: string): T {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Réponse du modèle illisible (pas de JSON).");
  return JSON.parse(m[0]) as T;
}

// ───────── 1. Réécriture pour une offre ─────────

export type Rewrite = { summary: string; bullets: Record<string, string[]>; notes: string };

export async function aiRewrite(o: Owner, cv: CV, jd: string, report: Report): Promise<Rewrite> {
  const entries = [...cv.experience, ...cv.projects, ...cv.extra].map((e) => ({ id: e.id, titre: e.heading, puces: e.bullets }));
  const out = await run(o, {
    system: `${promptText("rewrite", { langue: cv.lang === "fr" ? "français" : "anglais" })}\nRéponds uniquement par un objet JSON, sans texte autour.`,
    maxTokens: 2500,
    text: `Format : {"summary": "...", "bullets": {"<id>": ["...", "..."]}, "notes": "ce que tu as changé et pourquoi, 3 lignes max"}

OFFRE :
${jd}

ÉCARTS (ne pas les prétendre) : ${report.missing.map((t) => t.label).join(", ") || "aucun"}

RÉSUMÉ ACTUEL : ${cv.summary}
ENTRÉES : ${JSON.stringify(entries)}`,
  });
  const r = json<Rewrite>(out);
  return { summary: String(r.summary ?? ""), bullets: r.bullets ?? {}, notes: String(r.notes ?? "") };
}

// ───────── 2. Conseiller : quoi améliorer ─────────

export type OfferMemo = { label: string; date: string; missing: { key: string; weight: number }[]; text?: string; url?: string };

export async function aiAdvise(o: Owner, data: Data, offers: OfferMemo[], labelOf: (k: string) => string): Promise<string> {
  const p = data.fr;
  const compact = {
    cible: p.availability,
    competences: p.skillGroups,
    apprentissage: p.learning,
    entrees: [...p.experience.items, ...p.projects.items, ...p.extra.items].map((e) => ({ id: e.id, titre: e.title, role: e.role, puces: e.bullets, liens: e.links?.map((l) => l.href) ?? [] })),
  };
  const memos = offers.slice(-12).map((o) => ({
    offre: o.label,
    ecarts: o.missing.slice(0, 12).map((m) => labelOf(m.key)),
    extrait: (o.text ?? "").slice(0, 1200),
  }));
  return run(o, {
    maxTokens: 3000,
    system: promptText("advise"),
    text: `Voici mon profil actuel et les offres que j'ai enregistrées avec leurs écarts.

PROFIL : ${JSON.stringify(compact)}
OFFRES ENREGISTRÉES (${memos.length}) : ${JSON.stringify(memos)}`,
  });
}

// ───────── 2 bis. Préparer l'entretien ─────────

export async function aiInterview(o: Owner, data: Data, cv: CV, jd: string, report: Report): Promise<string> {
  const p = data[cv.lang];
  const compact = {
    competences: p.skillGroups,
    entrees: [...p.experience.items, ...p.projects.items, ...p.education.items, ...p.extra.items].map((e) => ({ titre: e.title, role: e.role, periode: e.period, puces: e.bullets, outils: e.skills })),
  };
  return run(o, {
    maxTokens: 3500,
    system: promptText("interview", { langue: cv.lang === "fr" ? "français" : "anglais" }),
    text: `OFFRE :
${jd.trim() || "(non fournie)"}

ÉCARTS (demandés par l'offre, absents de mon profil) : ${report.missing.map((t) => t.label).join(", ") || "aucun"}
ATOUTS COUVERTS : ${report.matched.map((t) => t.label).join(", ") || "aucun"}

PROFIL (seule source de faits) : ${JSON.stringify(compact)}

MON CV ADAPTÉ À CETTE OFFRE :
${cvToText(cv)}`,
  });
}

// ───────── 3. Capture d'écran / photo d'une offre → texte ─────────

export async function aiExtractOffer(o: Owner, mediaType: string, base64: string): Promise<string> {
  return run(o, {
    system: promptText("offer"),
    text: "Transcris le texte complet de l'offre visible sur cette image.",
    image: { mediaType, data: base64 },
    maxTokens: 2500,
  });
}

export const cvForPrompt = cvToText;
