// Copie dans le presse-papiers. `copyRich` colle avec la mise en forme (titres, listes, gras) dans Word, Docs, Notion, un mail…
// et en texte brut partout ailleurs. Repli automatique si le navigateur ne gère pas le format riche.
export async function copyPlain(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function copyRich(html: string, plain: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
  } catch {}
  return copyPlain(plain);
}
