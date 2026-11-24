import type { Lang } from "../app/content";
import { checkRewrite } from "./guard";
import type { Data, Owner } from "./owner";
import { ask, type Req } from "./providers";
import { promptText, type PromptId } from "./prompts";
import { AVOID, findSlop, type LengthRule, type SlopIssue } from "./slop";

// Lettre de motivation « sans cliché », dans ta voix.
// Ce qui rend une lettre générée repérable, c'est (1) des formules passe-partout, (2) de l'enthousiasme inventé, (3) un rythme uniforme.
// Réponses : (1) liste d'interdits + détecteur déterministe (lib/slop.ts), (2) seule ta raison réelle peut servir de motivation,
// chaque affirmation vient de ton profil et le garde-fou (lib/guard.ts) contrôle outils/chiffres, (3) un guide de style tiré de TES textes.

export type Kind = "letter" | "mail" | "followup" | "linkedin";

export const KINDS: Record<Kind, { label: string; noun: string; words: [number, number]; len: LengthRule; docx: boolean }> = {
  letter: { label: "Lettre", noun: "la lettre de motivation", words: [220, 300], len: { min: 150, max: 380, target: [220, 300] }, docx: true },
  mail: { label: "E-mail de candidature", noun: "l'e-mail de candidature", words: [90, 140], len: { min: 60, max: 200, target: [90, 140] }, docx: false },
  followup: { label: "Relance", noun: "l'e-mail de relance", words: [60, 100], len: { min: 40, max: 150, target: [60, 100] }, docx: false },
  linkedin: { label: "Message LinkedIn", noun: "le message LinkedIn", words: [50, 80], len: { min: 30, max: 120, target: [50, 80] }, docx: false },
};

export type LetterInput = {
  kind: Kind;
  lang: Lang;
  jd: string;
  role: string;
  company: string;
  data: Data;
  /** Ta vraie raison de viser ce poste / cette entreprise (facultatif, mais c'est ce qui sonne le plus juste). */
  why: string;
  /** Ce que tu veux mettre en avant (facultatif). */
  emphasis: string;
  styleGuide: string;
  samples: string;
  matched: string[];
  missing: string[];
};

export type Review = { slop: SlopIssue[]; guard: string[] };
export type LetterResult = { text: string; review: Review; repaired: boolean };

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

function facts(data: Data, lang: Lang) {
  const p = data[lang];
  return {
    nom: p.name,
    cible: p.availability,
    resume: p.profile.cvSummary,
    competences: p.skillGroups,
    entrees: [...p.experience.items, ...p.projects.items, ...p.education.items, ...p.extra.items].map((e) => ({
      titre: e.title, role: e.role, periode: e.period, puces: e.bullets, outils: e.skills,
    })),
    langues: p.languages,
  };
}

const FORM: Record<Lang, { out: string; hello: string; bye: string; subject: Record<Kind, string> }> = {
  fr: {
    out: "français", hello: "Madame, Monsieur,", bye: "Cordialement,",
    subject: { letter: "Objet : candidature au poste de …", mail: "Objet : candidature au stage de …", followup: "Objet : relance, candidature au poste de …", linkedin: "" },
  },
  en: {
    out: "anglais", hello: "Dear Hiring Team,", bye: "Best regards,",
    subject: { letter: "Subject: Application for the … position", mail: "Subject: Application for the … internship", followup: "Subject: Following up on my application", linkedin: "" },
  },
};

const system = (i: Pick<LetterInput, "kind" | "lang">): string => {
  const f = FORM[i.lang];
  const k = KINDS[i.kind];
  return promptText(i.kind as PromptId, {
    langue: f.out, objet: f.subject[i.kind], salutation: f.hello, politesse: f.bye,
    interdits: AVOID[i.lang], mots: `${k.words[0]} et ${k.words[1]}`,
  });
};

/** Contexte commun (offre, profil, voix), réutilisé pour la génération, la correction et le prompt à copier. */
function context(i: LetterInput): string {
  return `POSTE VISÉ : ${i.role || "(non précisé)"}${i.company ? ` chez ${i.company}` : ""}
RAISON PERSONNELLE : ${i.why.trim() || "(non fournie : ne simule aucune passion pour l'entreprise)"}
À METTRE EN AVANT : ${i.emphasis.trim() || "(au choix, selon l'offre)"}
ATOUTS DÉJÀ COUVERTS PAR LE PROFIL : ${i.matched.join(", ") || "(aucun repéré)"}
ÉCARTS (ne pas les prétendre) : ${i.missing.join(", ") || "aucun"}

OFFRE :
${cut(i.jd.trim() || "(non fournie)", 6000)}

PROFIL (seule source de faits) :
${JSON.stringify(facts(i.data, i.lang))}

GUIDE DE STYLE :
${i.styleGuide.trim() || "(aucun : écris simple, direct, sans emphase)"}

TEXTES DE RÉFÉRENCE (imiter la voix, ne rien recopier) :
${cut(i.samples.trim(), 8000) || "(aucun)"}`;
}

const letterReq = (i: LetterInput): Req => ({
  system: system(i),
  maxTokens: 1500,
  text: `Rédige ${KINDS[i.kind].noun}.\n\n${context(i)}`,
});

/** Prompt complet à coller dans Claude, ChatGPT… quand tu n'as pas de clé d'API. */
export const letterPrompt = (i: LetterInput) => {
  const r = letterReq(i);
  return `${r.system}\n\n---\n\n${r.text}`;
};

const repairReq = (i: LetterInput, letter: string, issues: string[]): Req => ({
  system: system(i),
  maxTokens: 1500,
  text: `Voici ${KINDS[i.kind].noun}. Elle contient des problèmes à corriger :\n${issues.map((m) => `- ${m}`).join("\n")}\n\nRéécris le texte complet : supprime chaque problème, garde les mêmes faits, la même structure et la même voix, change le minimum de mots. Remplace chaque formule générique par un fait concret du PROFIL, ou supprime la phrase. N'ajoute aucun fait nouveau.\n\nTEXTE :\n${letter}\n\n${context(i)}`,
});

/** Retire ce que les modèles ajoutent autour du texte (clôtures, guillemets) et le tiret cadratin, interdit ici. */
function clean(t: string): string {
  return t
    .replace(/^```\w*\n?|\n?```$/g, "")
    .replace(/^["«“]\s*|\s*["»”]$/g, "")
    .replace(/\s+—\s+/g, ", ")
    .replace(/—/g, ", ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Contrôle sans appel au modèle : utilisable en direct pendant que tu retouches le texte. */
export function reviewLetter(text: string, i: Pick<LetterInput, "kind" | "lang" | "data" | "jd" | "role" | "company">): Review {
  if (!text.trim()) return { slop: [], guard: [] };
  // la ligne d'objet reprend l'intitulé de l'offre : elle n'est pas contrôlée comme une affirmation sur ton profil
  const body = text.replace(/^\s*(objet|subject)\s*:.*$/im, "");
  return { slop: findSlop(text, i.lang, KINDS[i.kind].len), guard: checkRewrite([body], i.data, i.lang, `${i.jd} ${i.role} ${i.company}`) };
}

const messages = (r: Review) => r.slop.map((s) => s.message);

/** Génère la lettre ; si le détecteur trouve des clichés, une seule passe de correction automatique. */
export async function writeLetter(o: Owner, i: LetterInput): Promise<LetterResult> {
  let text = clean((await ask(o, letterReq(i))).text);
  let review = reviewLetter(text, i);
  let repaired = false;
  if (review.slop.length) {
    try {
      const next = clean((await ask(o, repairReq(i, text, messages(review)))).text);
      const nextReview = reviewLetter(next, i);
      if (next && nextReview.slop.length < review.slop.length) { text = next; review = nextReview; repaired = true; }
    } catch {
      // la 1re version reste valable : les problèmes restants sont affichés
    }
  }
  return { text, review, repaired };
}

/** Correction à la demande (bouton) d'un texte que tu as pu retoucher. */
export async function repairLetter(o: Owner, i: LetterInput, text: string): Promise<LetterResult> {
  const review = reviewLetter(text, i);
  if (!review.slop.length) return { text, review, repaired: false };
  const next = clean((await ask(o, repairReq(i, text, messages(review)))).text);
  return { text: next || text, review: reviewLetter(next || text, i), repaired: true };
}

/** À partir de tes propres textes (lettres, mails, rapports), extrait un guide de style court et modifiable. */
export async function extractStyle(o: Owner, samples: string): Promise<string> {
  const out = await ask(o, { maxTokens: 1500, system: promptText("style"), text: `TEXTES :\n${cut(samples.trim(), 10000)}` });
  return out.text.trim();
}
