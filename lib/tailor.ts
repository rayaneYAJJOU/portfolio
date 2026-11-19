import { content, contact, type Entry, type Lang, type Profile } from "../app/content";
import { labelFor, normalize, scan, stripKnown } from "./taxonomy";

// ───────────────────────── Types ─────────────────────────

export type TailorOptions = {
  lang: Lang;
  jd: string;
  targetRole?: string;
  company?: string;
  maxProjects?: number;
  maxProjectBullets?: number;
  educationFirst?: boolean;
  customSummary?: string;
  customHeadline?: string;
  /** Profil à utiliser (brouillon de l'éditeur) ; par défaut le profil publié. */
  data?: Record<Lang, Profile>;
  /** Puces réécrites (ex. par le modèle), par id d'entrée : remplacent les puces du profil. */
  bulletOverrides?: Record<string, string[]>;
};

export type Term = { key: string; label: string; weight: number; count: number; owned: boolean };

export type CVEntry = {
  id: string;
  heading: string;
  subheading?: string;
  period?: string;
  bullets: string[];
  score: number;
};

export type CVLabels = {
  summary: string; skills: string; experience: string; projects: string;
  education: string; extra: string; languages: string; coursework: string;
};

export type CV = {
  lang: Lang;
  name: string;
  headline: string;
  availability: string;
  contact: { text: string; href?: string }[];
  summary: string;
  skills: { label: string; items: string[] }[];
  experience: CVEntry[];
  projects: CVEntry[];
  education: CVEntry[];
  extra: CVEntry[];
  languages: string;
  educationFirst: boolean;
  labels: CVLabels;
};

export type Report = {
  coverage: number | null; // % du poids des termes reconnus de l'offre que ton profil couvre
  matched: Term[];
  missing: Term[];
  otherTerms: string[];
  detectedLang: Lang | null;
  warnings: string[];
};

export type Result = { cv: CV; report: Report };

const LABELS_CV: Record<Lang, CVLabels> = {
  en: { summary: "Summary", skills: "Skills", experience: "Experience", projects: "Projects", education: "Education", extra: "Activities", languages: "Languages", coursework: "Relevant coursework" },
  fr: { summary: "Profil", skills: "Compétences", experience: "Expérience professionnelle", projects: "Projets", education: "Formation", extra: "Activités extra-scolaires", languages: "Langues", coursework: "Enseignements clés" },
};

// ───────────────────────── Lecture de l'offre ─────────────────────────

const REQUIRED_H = /(requis|exig|obligatoire|profil recherche|competences? (requises|techniques|attendues)|requirements?|qualifications?|must have|what you.?ll need|what we.?re looking for|vous maitrisez|vous avez|your profile)/;
const NICE_H = /(atouts?|un plus|apprecie|souhait|nice to have|preferred|bonus|appreciated|is a plus)/;
const NEUTRAL_H = /(missions?|responsabilit|about|a propos|description|avantages|benefits|we offer|nous offrons|le poste|the role|your role|vos missions|responsibilities)/;

const STOP = new Set(("dans avec pour sont vous nous etre avoir cette votre notre leurs entre ainsi aussi alors tout tous toute toutes plus moins sans sous chez dont mais donc comme afin lors ces ses des les une un aux par sur the and for with you our your are will have has from that this their they them been into more than also such other what who how can may must should about work team role join help make need using able within across over each both those these where when which while".split(" ")));

/** Nettoie un titre d'offre collé tel quel (retire "(H/F)", "(m/f/d)", espaces multiples). */
export function cleanRole(raw: string): string {
  return raw.replace(/\(?\s*[HFMD]\s*\/\s*[HFMD](\s*\/\s*[HFMD])?\s*\)?/gi, "").replace(/\s{2,}/g, " ").replace(/[\s\-–|:]+$/, "").trim();
}

export function detectLang(text: string): Lang | null {
  const n = " " + normalize(text).replace(/[^a-z' ]+/g, " ") + " ";
  const count = (words: string[]) => words.reduce((a, w) => a + (n.split(` ${w} `).length - 1), 0);
  const fr = count(["de", "des", "les", "et", "vous", "pour", "une", "dans", "nous", "du", "au"]);
  const en = count(["the", "and", "you", "for", "with", "our", "will", "of", "to", "in", "are"]);
  if (fr + en < 8) return null;
  return fr > en ? "fr" : "en";
}

type Occ = { mult: number };

function analyzeJob(jd: string, targetRole?: string) {
  const occ = new Map<string, Occ[]>();
  const add = (text: string, mult: number) => {
    for (const [key, n] of scan(text)) {
      const arr = occ.get(key) ?? [];
      for (let i = 0; i < n; i++) arr.push({ mult });
      occ.set(key, arr);
    }
  };
  if (targetRole) add(targetRole, 2);

  let mult = 1;
  for (const raw of jd.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const n = normalize(line);
    if (line.length <= 70) {
      if (NICE_H.test(n)) { mult = 0.6; }
      else if (REQUIRED_H.test(n)) { mult = 1.5; }
      else if (NEUTRAL_H.test(n) || line.endsWith(":")) { mult = 1; }
    }
    add(line, mult);
  }

  const weights = new Map<string, { weight: number; count: number }>();
  for (const [key, list] of occ) {
    // le premier signal compte plein, les répétitions comptent peu (anti keyword-stuffing)
    const weight = list.reduce((s, o, i) => s + o.mult * (i === 0 ? 1 : 0.35), 0);
    weights.set(key, { weight: Math.min(weight, 4), count: list.length });
  }
  return weights;
}

function otherTerms(jd: string): string[] {
  const freq = new Map<string, number>();
  for (const w of stripKnown(jd).match(/[a-z][a-z0-9+#.-]{4,}/g) ?? []) {
    if (!STOP.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);
}

// ───────────────────────── Ce que le profil couvre ─────────────────────────

function entryText(e: Entry): string {
  return [e.title, e.role, e.context, ...e.skills, ...e.bullets].filter(Boolean).join("\n");
}

export function ownedKeys(p: Profile): Set<string> {
  const all = [
    ...p.skillGroups.flatMap((g) => g.items),
    ...p.languages.map((l) => l.lang),
    ...[...p.experience.items, ...p.projects.items, ...p.education.items, ...p.extra.items].map(entryText),
  ].join("\n");
  return new Set(scan(all).keys());
}

// ───────────────────────── Génération du CV ─────────────────────────

function pickBullets(bullets: string[], keyWeights: Map<string, number>, max: number): string[] {
  if (bullets.length <= max) return bullets;
  const scored = bullets.map((b, i) => ({ b, i, s: [...scan(b).keys()].reduce((a, k) => a + (keyWeights.get(k) ?? 0), 0) - i * 0.01 }));
  return scored.sort((a, b) => b.s - a.s).slice(0, max).sort((a, b) => a.i - b.i).map((x) => x.b);
}

function entryScore(e: Entry, keyWeights: Map<string, number>): number {
  return [...scan(entryText(e)).keys()].reduce((a, k) => a + (keyWeights.get(k) ?? 0), 0);
}

export function tailor(opts: TailorOptions): Result {
  const { lang } = opts;
  const p = (opts.data ?? content)[lang];
  const L = LABELS_CV[lang];
  const colon = lang === "fr" ? " :" : ":";
  const maxProjects = opts.maxProjects ?? 4;
  const maxProjectBullets = opts.maxProjectBullets ?? 2;

  const jobWeights = analyzeJob(opts.jd, opts.targetRole);
  const owned = ownedKeys(p);
  const keyWeights = new Map([...jobWeights].map(([k, v]) => [k, v.weight]));
  const hasJob = jobWeights.size > 0;

  // Rapport
  const terms: Term[] = [...jobWeights].map(([key, v]) => ({ key, label: labelFor(key, lang), weight: v.weight, count: v.count, owned: owned.has(key) }));
  terms.sort((a, b) => b.weight - a.weight);
  const matched = terms.filter((t) => t.owned);
  const missing = terms.filter((t) => !t.owned);
  const totalW = terms.reduce((a, t) => a + t.weight, 0);
  const coverage = totalW ? Math.round((matched.reduce((a, t) => a + t.weight, 0) / totalW) * 100) : null;

  // Entrées
  const toEntry = (e: Entry, maxBullets: number): CVEntry => ({
    id: e.id,
    heading: e.title,
    subheading: [e.role, e.place].filter(Boolean).join(" – ") || e.context,
    period: e.period,
    bullets: opts.bulletOverrides?.[e.id] ?? pickBullets(e.bullets, keyWeights, maxBullets),
    score: entryScore(e, keyWeights),
  });

  const experience = p.experience.items.map((e) => toEntry(e, 4));
  const projects = p.projects.items
    .map((e, i) => ({ e, i, s: entryScore(e, keyWeights) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, maxProjects)
    .map(({ e }) => {
      const entry = toEntry(e, maxProjectBullets);
      return { ...entry, heading: e.title, subheading: e.context };
    });
  const extra = p.extra.items.map((e) => toEntry(e, 2));

  const education = p.education.items.map((e) => {
    const ordered = [...e.skills].sort((a, b) => {
      const wa = [...scan(a).keys()].reduce((s, k) => s + (keyWeights.get(k) ?? 0), 0);
      const wb = [...scan(b).keys()].reduce((s, k) => s + (keyWeights.get(k) ?? 0), 0);
      return wb - wa;
    });
    const bullets = e.id === "ecc" && ordered.length ? [`${L.coursework}${colon} ${ordered.slice(0, 8).join(", ")}.`] : [];
    return { id: e.id, heading: e.title, subheading: e.role, period: e.period, bullets, score: 0 };
  });

  // Compétences : mêmes groupes, éléments pertinents d'abord, groupes pertinents d'abord
  const skills = p.skillGroups
    .map((g, gi) => {
      const items = g.items
        .map((it, i) => ({ it, i, w: [...scan(it).keys()].reduce((s, k) => s + (keyWeights.get(k) ?? 0), 0) }))
        .sort((a, b) => b.w - a.w || a.i - b.i);
      return { label: g.label, items: items.map((x) => x.it), w: items.reduce((s, x) => s + x.w, 0), gi };
    })
    .sort((a, b) => b.w - a.w || a.gi - b.gi)
    .map(({ label, items }) => ({ label, items }));

  // Compétences en cours d'apprentissage : uniquement celles que l'offre demande, et clairement étiquetées.
  const learning = p.learning.filter((it) => [...scan(it).keys()].some((k) => keyWeights.has(k)));
  if (learning.length) skills.push({ label: lang === "fr" ? "En cours d'apprentissage" : "Currently learning", items: learning });

  // Titre & résumé
  const roleTxt = opts.targetRole?.trim();
  const headline =
    opts.customHeadline?.trim() ||
    (roleTxt
      ? lang === "fr"
        ? `Élève ingénieur, École Centrale Casablanca | Recherche : ${roleTxt}`
        : `Engineering Student, École Centrale Casablanca | Seeking: ${roleTxt}`
      : p.headline);

  const topOwned = matched.filter((t) => !["english", "french", "arabic"].includes(t.key)).slice(0, 5).map((t) => t.label);
  const summary =
    opts.customSummary?.trim() ||
    (topOwned.length
      ? `${p.profile.cvSummary} ${lang === "fr" ? "Atouts pour ce poste" : "Strengths for this role"}${colon} ${topOwned.join(", ")}.`
      : p.profile.cvSummary);

  const cv: CV = {
    lang,
    name: p.name,
    headline,
    availability: opts.company?.trim()
      ? `${p.availability} – ${opts.company.trim()}`
      : p.availability,
    contact: [
      { text: contact.email, href: `mailto:${contact.email}` },
      { text: contact.phone, href: `tel:${contact.phone.replace(/\s/g, "")}` },
      { text: lang === "fr" ? "Kénitra, Maroc" : contact.location },
      { text: contact.linkedin.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), href: contact.linkedin },
      { text: contact.github.replace(/^https?:\/\//, ""), href: contact.github },
    ],
    summary,
    skills,
    experience,
    projects,
    education,
    extra,
    languages: p.languages.map((l) => `${l.lang} (${l.level})`).join(", "),
    educationFirst: !!opts.educationFirst,
    labels: L,
  };

  // Alertes
  const warnings: string[] = [];
  if (!opts.jd.trim()) warnings.push(lang === "fr" ? "Colle une offre pour adapter le CV." : "Paste a job description to tailor the CV.");
  else if (!hasJob) warnings.push(lang === "fr" ? "Aucune compétence reconnue dans cette offre : vérifie le texte collé." : "No known skills recognized in this posting: check the pasted text.");
  const detected = detectLang(opts.jd);
  if (detected && detected !== lang)
    warnings.push(lang === "fr" ? "L'offre est en anglais : un CV en anglais maximise la correspondance des mots-clés." : "The posting is in French: a French CV maximizes keyword matching.");
  const lines = estimateLines(cv);
  if (lines > PAGE_LINES) warnings.push(lang === "fr" ? `CV probablement trop long pour une page (~${lines} lignes) : réduis le nombre de projets.` : `CV likely exceeds one page (~${lines} lines): reduce the number of projects.`);

  return {
    cv,
    report: { coverage, matched, missing, otherTerms: hasJob ? otherTerms(opts.jd) : [], detectedLang: detected, warnings },
  };
}

/** Nombre maximal de projets qui garde le CV sur une page. */
export function fitProjects(opts: TailorOptions): number {
  for (let n = 6; n > 1; n--) if (estimateLines(tailor({ ...opts, maxProjects: n }).cv) <= PAGE_LINES) return n;
  return 1;
}

export const PAGE_LINES = 68; // calibré sur des mesures réelles (A4, Arial 9 pt)

export function estimateLines(cv: CV): number {
  const wrap = (s: string, w = 105) => Math.max(1, Math.ceil(s.length / w));
  let n = 4 + wrap(cv.summary) + 1;
  n += 2 + cv.skills.reduce((a, g) => a + wrap(`${g.label}: ${g.items.join(", ")}`), 0);
  for (const sec of [cv.experience, cv.projects, cv.education, cv.extra]) {
    n += 2;
    for (const e of sec) n += 1 + (e.subheading ? 1 : 0) + e.bullets.reduce((a, b) => a + wrap(b, 98), 0);
  }
  return n + 3;
}

/** Coordonnées sur deux lignes fixes (e-mail, téléphone, lieu / puis liens LinkedIn, GitHub) : jamais de « | » orphelin en fin de ligne. */
export function contactLines(cv: CV): CV["contact"][] {
  const isLink = (c: { href?: string }) => !!c.href && /^https?:/.test(c.href);
  return [cv.contact.filter((c) => !isLink(c)), cv.contact.filter(isLink)].filter((l) => l.length);
}
