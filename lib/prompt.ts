import { cvToText } from "./cvText";
import type { CV, Report } from "./tailor";

// Prompt prêt à coller dans Claude (ou tout autre modèle) : aucune clé d'API sur le site.
// Le modèle reformule et conseille ; il n'a pas le droit d'inventer.
export function buildPrompt(cv: CV, jd: string, report: Report): string {
  const gaps = report.missing.map((t) => t.label).join(", ") || "(aucun détecté)";
  const covered = report.matched.map((t) => t.label).join(", ") || "(aucun)";
  return `Tu es un conseiller en recrutement pour étudiants ingénieurs. Je postule à l'offre ci-dessous.
Voici mon CV actuel (généré à partir de mon vrai profil) et l'offre.

RÈGLES (impératives)
- N'invente AUCUN outil, résultat, chiffre, durée ou responsabilité. Tout ce que tu écris doit être défendable en entretien technique.
- Quand un chiffre améliorerait une puce mais que je ne l'ai pas donné, écris [À COMPLÉTER : quel chiffre] au lieu de l'inventer.
- Reprends le vocabulaire exact de l'offre quand il est vrai pour moi. Verbes d'action, contexte, résultat. Une idée par puce.
- Réponds dans la langue du CV (${cv.lang === "fr" ? "français" : "anglais"}).

TÂCHES
1. Réécris le résumé (3 phrases max) pour cette offre.
2. Réécris les puces de chaque expérience et projet, dans le même ordre, sans ajouter de contenu nouveau.
3. "Pistes de renforcement" : pour chaque écart ci-dessous, dis s'il est critique ou secondaire pour ce poste, propose un mini-projet de 1 à 2 semaines pour le combler réellement, et la formulation honnête à utiliser seulement une fois que c'est vrai (ex. « en cours d'apprentissage »).
4. Cinq questions d'entretien probables sur ce qui est écrit dans mon CV, avec ce que je dois pouvoir répondre.

COMPÉTENCES DE L'OFFRE DÉJÀ COUVERTES : ${covered}
ÉCARTS (demandés par l'offre, absents de mon profil) : ${gaps}

=== OFFRE ===
${jd.trim() || "(non fournie)"}

=== MON CV ACTUEL ===
${cvToText(cv)}`;
}
