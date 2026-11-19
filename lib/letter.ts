import type { Lang } from "../app/content";
import { checkRewrite } from "./guard";
import type { Data, Owner } from "./owner";
import { ask, type Req } from "./providers";
import { AVOID, findSlop, type SlopIssue } from "./slop";

// Lettre de motivation « sans cliché », dans ta voix.
// Ce qui rend une lettre générée repérable, c'est (1) des formules passe-partout, (2) de l'enthousiasme inventé, (3) un rythme uniforme.
// Réponses : (1) liste d'interdits + détecteur déterministe (lib/slop.ts), (2) seule ta raison réelle peut servir de motivation,
// chaque affirmation vient de ton profil et le garde-fou (lib/guard.ts) contrôle outils/chiffres, (3) un guide de style tiré de TES textes.

export type LetterInput = {
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

const FORM: Record<Lang, { out: string; subject: string; hello: string; bye: string }> = {
  fr: { out: "français", subject: "Objet : candidature au poste de …", hello: "Madame, Monsieur,", bye: "Cordialement," },
  en: { out: "anglais", subject: "Subject: Application for the … position", hello: "Dear Hiring Team,", bye: "Best regards," },
};

function system(lang: Lang): string {
  const f = FORM[lang];
  return `Tu rédiges la lettre de motivation d'un étudiant ingénieur, à sa place et dans sa voix. Elle doit se lire comme écrite par lui, jamais comme générée.

RÈGLES DE FOND
1. Chaque affirmation s'appuie sur un fait du PROFIL (projet nommé, outil, résultat). N'invente AUCUN outil, chiffre, durée, responsabilité, enthousiasme ni fait sur l'entreprise. Ce que tu sais de l'entreprise vient uniquement de l'OFFRE.
2. Relie 2 ou 3 missions précises de l'offre à des choses précises que l'étudiant a faites : nomme le projet ou le stage et dis ce qu'il y a fait. Ne décris pas sa personnalité (« rigoureux », « motivé », « passionné ») : montre-la par un fait.
3. N'affirme jamais une compétence listée dans ÉCARTS, et ne t'excuse pas de ce qui manque : n'en parle pas.
4. Motivation : si une RAISON PERSONNELLE est fournie, utilise-la fidèlement (même fond, formulée dans sa voix). Sinon, ne simule AUCUNE passion pour l'entreprise : parle de l'adéquation entre les missions et son parcours.

RÈGLES DE FORME
- Langue de la lettre : ${f.out}. Entre 220 et 300 mots.
- Structure : une ligne d'objet (« ${f.subject} »), « ${f.hello} », trois paragraphes courts (pourquoi ce poste, ce qu'il a fait de pertinent, disponibilité), « ${f.bye} », prénom et nom. Ni adresse, ni date, ni coordonnées : elles sont ajoutées à part.
- Première phrase : le poste visé et un fait précis ou la vraie raison. Jamais une formule d'ouverture.
- Verbes concrets, phrases de longueurs variées, pas d'abstractions empilées. Pas de question rhétorique, pas de point d'exclamation, pas de tiret cadratin (—), pas de puces, pas de gras, pas de Markdown.
- Pas de liste de trois éléments systématique, pas de « non seulement… mais aussi », pas de « ce n'est pas X, c'est Y ».
- Tournures à ne jamais écrire, ni leurs équivalents :
${AVOID[lang]}

VOIX
Si un GUIDE DE STYLE ou des TEXTES DE RÉFÉRENCE sont fournis, ils priment sur ces consignes de forme pour le rythme, le registre, le vocabulaire et la ponctuation. Imite la manière d'écrire, jamais le contenu : ne recopie ni phrase, ni anecdote, ni fait des textes de référence.

Réponds uniquement par la lettre, sans commentaire ni explication.`;
}

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
  system: system(i.lang),
  maxTokens: 1500,
  text: `Rédige la lettre de motivation.\n\n${context(i)}`,
});

/** Prompt complet à coller dans Claude, ChatGPT… quand tu n'as pas de clé d'API. */
export const letterPrompt = (i: LetterInput) => {
  const r = letterReq(i);
  return `${r.system}\n\n---\n\n${r.text}`;
};

const repairReq = (i: LetterInput, letter: string, issues: string[]): Req => ({
  system: system(i.lang),
  maxTokens: 1500,
  text: `Voici une lettre de motivation. Elle contient des problèmes à corriger :\n${issues.map((m) => `- ${m}`).join("\n")}\n\nRéécris la lettre complète : supprime chaque problème, garde les mêmes faits, la même structure et la même voix, change le minimum de mots. Remplace chaque formule générique par un fait concret du PROFIL, ou supprime la phrase. N'ajoute aucun fait nouveau.\n\nLETTRE :\n${letter}\n\n${context(i)}`,
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
export function reviewLetter(text: string, i: Pick<LetterInput, "lang" | "data" | "jd" | "role" | "company">): Review {
  if (!text.trim()) return { slop: [], guard: [] };
  // la ligne d'objet reprend l'intitulé de l'offre : elle n'est pas contrôlée comme une affirmation sur ton profil
  const body = text.replace(/^\s*(objet|subject)\s*:.*$/im, "");
  return { slop: findSlop(text, i.lang), guard: checkRewrite([body], i.data, i.lang, `${i.jd} ${i.role} ${i.company}`) };
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
  const out = await ask(o, {
    maxTokens: 1500,
    system: `Tu analyses la manière d'écrire d'une personne à partir de textes qu'elle a elle-même écrits, pour qu'un rédacteur puisse l'imiter. Tu décris la FORME uniquement : jamais les faits, anecdotes ou idées des textes. Réponds en français, en Markdown simple.`,
    text: `Voici des textes écrits par la personne (français et/ou anglais). Pour CHAQUE langue présente, produis une section « ## Français » ou « ## English » avec 8 à 10 puces observables et concrètes :
- longueur moyenne des phrases (en mots) et variation du rythme
- personne grammaticale, tutoiement/vouvoiement, registre (soutenu, courant, direct)
- connecteurs et transitions qu'elle utilise vraiment
- ponctuation : deux-points, parenthèses, virgules, points-virgules, tirets
- 4 à 6 tournures ou mots récurrents à reprendre (courts, exacts, entre guillemets)
- ce qu'elle évite : emphase, adjectifs, formules d'ouverture, longueur des paragraphes
Si un texte est trop court pour conclure sur un point, écris « non observé » plutôt que d'inventer.

TEXTES :
${cut(samples.trim(), 10000)}`,
  });
  return out.text.trim();
}
