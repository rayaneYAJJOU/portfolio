import { cvToText } from "./cvText";
import type { Data, OwnerSettings } from "./owner";
import type { CV, Report } from "./tailor";

// Appels directs à l'API Anthropic depuis TON navigateur, avec ta clé (stockée localement, jamais publiée).
// Conseil : crée une clé dédiée avec une limite de dépense dans la console Anthropic.

export const DEFAULT_MODEL = "claude-sonnet-5-5";

type Block = { type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

async function ask(s: OwnerSettings, system: string, content: Block[], maxTokens = 2000): Promise<string> {
  if (!s.aiKey) throw new Error("Aucune clé IA : ajoute-la dans /admin/.");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": s.aiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: s.model || DEFAULT_MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content }] }),
  });
  const j: { content?: { type: string; text?: string }[]; error?: { message?: string } } = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message ?? `Erreur API (${r.status})`);
  return (j.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim();
}

const RULES = `Règles impératives : n'invente AUCUN outil, résultat, chiffre, durée, responsabilité ni compétence. Tout doit être défendable en entretien technique. Si un chiffre améliorerait une phrase mais n'est pas fourni, écris [À COMPLÉTER : quel chiffre] au lieu de l'inventer.`;

function json<T>(text: string): T {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Réponse du modèle illisible (pas de JSON).");
  return JSON.parse(m[0]) as T;
}

// ───────── 1. Réécriture pour une offre ─────────

export type Rewrite = { summary: string; bullets: Record<string, string[]>; notes: string };

export async function aiRewrite(s: OwnerSettings, cv: CV, jd: string, report: Report): Promise<Rewrite> {
  const entries = [...cv.experience, ...cv.projects, ...cv.extra].map((e) => ({ id: e.id, titre: e.heading, puces: e.bullets }));
  const out = await ask(
    s,
    `Tu es un conseiller en recrutement pour étudiants ingénieurs. ${RULES} Réponds uniquement par un objet JSON, sans texte autour.`,
    [{
      type: "text",
      text: `Langue de sortie : ${cv.lang === "fr" ? "français" : "anglais"}.
Reformule pour cette offre : (1) le résumé (3 phrases max), (2) les puces de chaque entrée (même nombre ou moins, même ordre, verbe d'action + contexte + résultat, vocabulaire de l'offre quand il est vrai pour moi).
Format : {"summary": "...", "bullets": {"<id>": ["...", "..."]}, "notes": "ce que tu as changé et pourquoi, 3 lignes max"}

OFFRE :
${jd}

ÉCARTS (ne pas les prétendre) : ${report.missing.map((t) => t.label).join(", ") || "aucun"}

RÉSUMÉ ACTUEL : ${cv.summary}
ENTRÉES : ${JSON.stringify(entries)}`,
    }],
    2500,
  );
  const r = json<Rewrite>(out);
  return { summary: String(r.summary ?? ""), bullets: r.bullets ?? {}, notes: String(r.notes ?? "") };
}

// ───────── 2. Conseiller : quoi améliorer ─────────

export type OfferMemo = { label: string; date: string; missing: { key: string; weight: number }[]; text?: string; url?: string };

export async function aiAdvise(s: OwnerSettings, data: Data, offers: OfferMemo[], labelOf: (k: string) => string): Promise<string> {
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
  return ask(
    s,
    `Tu es un mentor de carrière pour un étudiant ingénieur (ML/data/logiciel) qui cherche un stage de fin d'études. ${RULES} Sois concret, priorise, et pose des questions précises quand il manque un fait. Réponds en français, en Markdown simple (titres ##, listes).`,
    [{
      type: "text",
      text: `Voici mon profil actuel et les offres que j'ai enregistrées avec leurs écarts.
Produis :
## Points forts à mettre en avant
## Faiblesses concrètes du profil/CV (par entrée : ce qui manque, et la question précise à laquelle je dois répondre pour le corriger, ex. volume de données, métrique, comparaison)
## Plan d'apprentissage priorisé d'après les offres (ordre, mini-projet de 1-2 semaines par item, comment le formuler honnêtement sur le CV)
## Améliorations du portfolio et du GitHub (README des projets, démos, liens manquants)
## Actions de cette semaine (5 maximum)

PROFIL : ${JSON.stringify(compact)}
OFFRES ENREGISTRÉES (${memos.length}) : ${JSON.stringify(memos)}`,
    }],
    3000,
  );
}

// ───────── 3. Capture d'écran / photo d'une offre → texte ─────────

export async function aiExtractOffer(s: OwnerSettings, mediaType: string, base64: string): Promise<string> {
  return ask(
    s,
    "Tu transcris fidèlement des offres d'emploi ou de stage à partir d'images. Réponds uniquement par le texte de l'offre (titre, entreprise, missions, profil, avantages), sans commentaire.",
    [
      { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
      { type: "text", text: "Transcris le texte complet de l'offre visible sur cette image." },
    ],
    2500,
  );
}

export const cvForPrompt = cvToText;
