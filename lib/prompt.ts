import { cvToText } from "./cvText";
import { promptText } from "./prompts";
import type { CV, Report } from "./tailor";

// Prompt prêt à coller dans Claude (ou tout autre modèle) : aucune clé d'API sur le site.
// Le modèle reformule et conseille ; il n'a pas le droit d'inventer.
export function buildPrompt(cv: CV, jd: string, report: Report): string {
  const gaps = report.missing.map((t) => t.label).join(", ") || "(aucun détecté)";
  const covered = report.matched.map((t) => t.label).join(", ") || "(aucun)";
  return `${promptText("manual", { langue: cv.lang === "fr" ? "français" : "anglais" })}

COMPÉTENCES DE L'OFFRE DÉJÀ COUVERTES : ${covered}
ÉCARTS (demandés par l'offre, absents de mon profil) : ${gaps}

=== OFFRE ===
${jd.trim() || "(non fournie)"}

=== MON CV ACTUEL ===
${cvToText(cv)}`;
}
