import type { CV, CVEntry } from "./tailor";

// Version texte brut : pour les formulaires de candidature qui demandent de coller le CV.
export function cvToText(cv: CV): string {
  const out: string[] = [cv.name.toUpperCase(), cv.headline, cv.contact.map((c) => c.text).join(" | "), cv.availability, ""];
  const section = (title: string, body: string[]) => out.push(title.toUpperCase(), ...body, "");
  const entries = (list: CVEntry[]) =>
    list.flatMap((e) => [
      [e.heading, e.period].filter(Boolean).join(" | "),
      ...(e.subheading ? [e.subheading] : []),
      ...e.bullets.map((b) => `- ${b}`),
      "",
    ]).slice(0, -1);

  section(cv.labels.summary, [cv.summary]);
  section(cv.labels.skills, cv.skills.map((g) => `${g.label}: ${g.items.join(", ")}`));
  const exp = () => section(cv.labels.experience, entries(cv.experience));
  const edu = () => section(cv.labels.education, entries(cv.education));
  if (cv.educationFirst) { edu(); exp(); } else { exp(); }
  section(cv.labels.projects, entries(cv.projects));
  if (!cv.educationFirst) edu();
  section(cv.labels.extra, entries(cv.extra));
  section(cv.labels.languages, [cv.languages]);
  return out.join("\n").trim() + "\n";
}
