/* eslint-disable @typescript-eslint/no-explicit-any -- on valide ici du JSON non fiable */
import type { Lang } from "../app/content";

const SECTIONS = ["experience", "education", "projects", "extra"] as const;
const isStr = (x: unknown): x is string => typeof x === "string";
const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every(isStr);

/** Contrôle structurel avant publication : un fichier cassé ferait échouer le build du site. */
export function validateProfile(data: unknown): string[] {
  const errs: string[] = [];
  const d = data as Record<string, any>;
  const ids: Record<string, string[]> = {};
  for (const lang of ["fr", "en"] as Lang[]) {
    const p = d?.[lang];
    if (!p || typeof p !== "object") { errs.push(`[${lang}] profil manquant`); continue; }
    for (const k of ["name", "tagline", "headline", "availability"]) if (!isStr(p[k])) errs.push(`[${lang}] ${k} doit être un texte`);
    if (!isStr(p.profile?.body) || !isStr(p.profile?.cvSummary)) errs.push(`[${lang}] profile.body / cvSummary manquants`);
    if (!Array.isArray(p.skillGroups) || !p.skillGroups.every((g: any) => isStr(g?.label) && isStrArr(g?.items))) errs.push(`[${lang}] skillGroups invalide`);
    if (!isStrArr(p.learning ?? [])) errs.push(`[${lang}] learning invalide`);
    for (const sec of SECTIONS) {
      const items = p[sec]?.items;
      if (!Array.isArray(items)) { errs.push(`[${lang}] ${sec}.items manquant`); continue; }
      ids[`${lang}.${sec}`] = items.map((e: any) => e?.id);
      items.forEach((e: any, i: number) => {
        if (!isStr(e?.id) || !e.id) errs.push(`[${lang}] ${sec}[${i}] : id manquant`);
        if (!isStr(e?.title) || !e.title.trim()) errs.push(`[${lang}] ${sec}[${i}] : titre vide`);
        if (!isStr(e?.body)) errs.push(`[${lang}] ${sec}[${i}] : body invalide`);
        if (!isStrArr(e?.bullets)) errs.push(`[${lang}] ${sec}[${i}] : bullets invalide`);
        if (!isStrArr(e?.skills)) errs.push(`[${lang}] ${sec}[${i}] : skills invalide`);
      });
    }
  }
  for (const sec of SECTIONS)
    if (JSON.stringify(ids[`fr.${sec}`]) !== JSON.stringify(ids[`en.${sec}`])) errs.push(`${sec} : FR et EN doivent avoir les mêmes entrées, dans le même ordre`);
  return errs;
}
