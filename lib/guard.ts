import type { Lang } from "../app/content";
import { labelFor, scan } from "./taxonomy";
import { ownedKeys } from "./tailor";
import type { Data } from "./owner";

// Garde-fou : un texte produit par le modèle ne doit rien introduire qui ne soit dans ton profil.
/** `context` : texte déjà fourni au modèle (ex. l'offre) dont les nombres ne comptent pas comme inventés. */
export function checkRewrite(texts: string[], data: Data, lang: Lang, context = ""): string[] {
  const p = data[lang];
  const owned = ownedKeys(p);
  const original = `${JSON.stringify(p)} ${context}`;
  const issues: string[] = [];
  const all = texts.join("\n");

  for (const key of scan(all).keys())
    if (!owned.has(key)) issues.push(`Cite « ${labelFor(key, lang)} », absent de ton profil.`);

  const known = new Set(original.match(/\d+(?:[.,]\d+)?/g) ?? []);
  const fresh = [...new Set(all.match(/\d+(?:[.,]\d+)?/g) ?? [])].filter((n) => !known.has(n));
  if (fresh.length) issues.push(`Nombres absents de ton profil : ${fresh.join(", ")}.`);

  const todo = all.match(/\[(?:À COMPLÉTER|A COMPLETER|TO COMPLETE|TODO)[^\]]*\]/gi) ?? [];
  if (todo.length) issues.push(`${todo.length} passage(s) « À COMPLÉTER » : renseigne le chiffre réel ou retire la phrase.`);
  return issues;
}
