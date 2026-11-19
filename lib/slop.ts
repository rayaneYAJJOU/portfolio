import type { Lang } from "../app/content";

// Détecteur de « slop » : tournures typiques des textes générés (ou des lettres-types) qu'un recruteur repère en une ligne.
// Déterministe : il ne dépend d'aucun modèle, donc il vaut aussi pour un texte que tu as écrit ou retouché toi-même.
// Les motifs sont écrits sans accents, en minuscules : le texte est normalisé avant comparaison.

export type SlopIssue = { kind: "phrase" | "structure"; message: string; found?: string };

const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[’‘`´]/g, "'").replace(/\u00a0|\u202f/g, " ");

const FR: RegExp[] = [
  /je me permets de/, /c'est avec (un |une )?(vif|grand|immense|profond|reel)\w* (interet|enthousiasme|plaisir|motivation)/, /vif interet/, /avec grand plaisir/,
  /\bfort(e)? de (mon|ma|mes|cette|ces|une|un)\b/, /passionn(e|ee)? par/, /ma passion pour/, /anime(e)? par/,
  /dans un monde en (constante |perpetuelle )?(evolution|mutation|mouvement|transformation)/, /a l'ere (de|du|des)/, /a l'heure ou/, /dans le paysage/,
  /\blevier/, /synergie/, /valeur ajoutee/, /force de proposition/, /esprit d'equipe/, /soif d'apprendre/, /curieux de nature/, /curiosite (insatiable|naturelle)/,
  /dynamique et motive/, /rigoureux(se)? et autonome/, /autonome et rigoureux/, /relever (de |des )?(nouveaux |nouvelles )?defis/, /defis? (stimulants?|passionnants?|ambitieux)/,
  /mettre (a profit|mes competences au service)/, /apporter ma pierre/, /contribuer (activement |pleinement )?a (la reussite|vos projets|votre)/,
  /au sein de (votre|cette) (prestigieuse|renommee|belle|dynamique|grande|entreprise|structure|equipe)/, /\b(prestigieux|prestigieuse|renomme|renommee)\b/, /\bleader (du|dans|de)\b/,
  /je suis (profondement |fermement )?(convaincu|persuade)(e)? (que|de)/, /mon profil (atypique|polyvalent|singulier|unique)/, /\bveritable(s)? (atout|opportunite|passion|defi)/,
  /opportunite (unique|exceptionnelle|de rejoindre|d'integrer)/, /experience (enrichissante|formatrice et enrichissante)/, /environnement (stimulant|dynamique|innovant|de travail stimulant)/,
  /au coeur de/, /pleinement/, /n'hesitez pas a/, /dans l'attente de (votre|vous)/, /je reste a (votre )?(entiere )?disposition/, /je serais (ravi|enchante|heureux)(e)? de/, /serait un honneur/,
  /non seulement.{3,80}mais (aussi|egalement)/, /ne se limite pas a/, /ce n'est pas (seulement|simplement|juste).{3,80}c'est/, /plus qu'(un|une)\b/, /joindre l'utile/,
  /approfondir mes connaissances/, /en constante evolution/, /sans cesse/, /toujours (a l'affut|en quete)/, /idealement place/, /cadre ideal/,
];

const EN: RegExp[] = [
  /i am (writing to express|thrilled|excited|delighted|eager|enthusiastic|passionate|keen)/, /i'm (thrilled|excited|delighted|eager|passionate)/, /passionate (about|for)/, /i am confident that/,
  /\bdelve/, /\bleverag/, /tapestry/, /testament/, /in today's (fast-paced|ever-changing|digital|competitive|rapidly)/, /fast-paced/, /ever-(evolving|changing)/, /rapidly evolving/,
  /\bdynamic\b(?! programming)/, /cutting-edge/, /state-of-the-art/, /\bsynerg/, /\bspearhead/, /\brobust\b/, /\bseamless/, /\bholistic/, /\binnovative\b/, /game-chang/, /\bpivotal/, /\bunderscore/, /\bfoster(ing)?\b/,
  /\brealm\b/, /\blandscape\b/, /\bnavigat(e|ing)\b/, /\bjourney\b/, /\belevate/, /\bunlock(ing)?\b/, /\bempower/, /commitment to excellence/, /proven track record/, /hit the ground running/,
  /team player/, /detail-oriented/, /results-driven/, /go above and beyond/, /unique opportunity/, /valuable (addition|asset)/, /i would welcome the opportunity/, /i look forward to the opportunity/,
  /please do not hesitate/, /do not hesitate to/, /i believe (i would|that i)/, /not only.{3,80}but also/, /it'?s not (just|merely|only).{3,80}(it'?s|but)/, /more than just/, /a testament to/,
  /eager to (contribute|learn|join)/, /thirst for/, /my passion for/, /well-suited/, /uniquely positioned/,
];

const sentences = (t: string) => t.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
const words = (t: string) => (t.match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;

/** Cherche les tournures génériques et les tics de texte généré. Renvoie une liste vide si le texte est propre. */
export function findSlop(text: string, lang: Lang): SlopIssue[] {
  const issues: SlopIssue[] = [];
  const n = norm(text);

  const seen = new Set<string>();
  for (const re of lang === "fr" ? FR : EN) {
    const m = re.exec(n);
    if (!m) continue;
    // on retrouve le passage dans le texte d'origine (même longueur après normalisation dans la grande majorité des cas)
    let end = m.index + m[0].length;
    while (end < text.length && /\p{L}/u.test(text[end]) && /\p{L}/u.test(text[end - 1])) end++; // mot complet (« leverag » → « leverage »)
    const raw = text.slice(m.index, end).trim() || m[0];
    if (seen.has(m[0])) continue;
    seen.add(m[0]);
    issues.push({ kind: "phrase", found: raw, message: `Tournure générique : « ${raw} »` });
  }

  if (/—/.test(text)) issues.push({ kind: "structure", message: "Tiret cadratin (—) : signature typique d'un texte généré. Remplace par une virgule, un point ou deux-points." });
  if (/ [–-] /.test(text.replace(/^objet.*$/im, "").replace(/^subject.*$/im, ""))) issues.push({ kind: "structure", message: "Tiret long utilisé comme ponctuation (« – ») : préfère la virgule ou le point." });
  if (/!/.test(text)) issues.push({ kind: "structure", message: "Point d'exclamation : à éviter dans une lettre de candidature." });
  if (/\*\*|^#{1,6}\s|^\s*[-*•]\s/m.test(text)) issues.push({ kind: "structure", message: "Mise en forme Markdown (gras, titres, puces) : une lettre s'écrit en paragraphes." });

  const starts = sentences(text).map((s) => norm(s).replace(/^[^a-z]+/, "").split(/[\s']/)[0]);
  for (let i = 0; i + 2 < starts.length; i++) {
    if (starts[i] && starts[i] === starts[i + 1] && starts[i] === starts[i + 2]) {
      issues.push({ kind: "structure", message: `Trois phrases de suite commencent par « ${starts[i]} » : varie les attaques.` });
      break;
    }
  }

  const w = words(text);
  if (w && (w < 150 || w > 380)) issues.push({ kind: "structure", message: `Longueur : ${w} mots. Vise 200 à 320 mots (une page).` });
  return issues;
}

/** Les consignes « à ne pas écrire », injectées dans le prompt pour que le modèle évite ces tournures dès la 1re version. */
export const AVOID: Record<Lang, string> = {
  fr: [
    "« je me permets de », « c'est avec un vif intérêt », « fort de », « passionné par », « dans un monde en constante évolution », « à l'ère de »",
    "« levier », « synergie », « valeur ajoutée », « force de proposition », « esprit d'équipe », « soif d'apprendre », « relever des défis »",
    "« prestigieux », « renommé », « leader », « au sein de votre entreprise », « opportunité unique », « au cœur de », « pleinement »",
    "« je suis convaincu que », « n'hésitez pas à », « je reste à votre disposition », « je serais ravi de », « non seulement… mais aussi », « ce n'est pas X, c'est Y »",
  ].join("\n"),
  en: [
    "\"I am writing to express\", \"I am thrilled/excited/eager/passionate\", \"passionate about\", \"I am confident that\"",
    "\"delve\", \"leverage\", \"tapestry\", \"testament\", \"in today's fast-paced\", \"ever-evolving\", \"landscape\", \"realm\", \"navigate\", \"journey\"",
    "\"dynamic\", \"cutting-edge\", \"innovative\", \"robust\", \"seamless\", \"holistic\", \"synergy\", \"foster\", \"empower\", \"elevate\", \"unlock\"",
    "\"proven track record\", \"team player\", \"detail-oriented\", \"hit the ground running\", \"unique opportunity\", \"please do not hesitate\", \"not only… but also\", \"it's not just X, it's Y\"",
  ].join("\n"),
};
