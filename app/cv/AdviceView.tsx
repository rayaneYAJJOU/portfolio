"use client";

import { copyPlain, copyRich } from "../../lib/clipboard";
import { Markdown, mdToHtml, mdToPlain } from "../../lib/markdown";
import { CopyButton } from "./CopyBar";

// Réponse de « Que dois-je améliorer ? » : le modèle écrit en Markdown, on l'affiche mis en forme
// et on peut le copier (mis en forme, ou Markdown brut) ou l'effacer.
export function AdviceView({ text, onClear }: { text: string; onClear: () => void }) {
  return (
    <div className="adviceBox">
      <div className="actions adviceActions">
        <CopyButton label="Copier" onCopy={() => copyRich(mdToHtml(text), mdToPlain(text))} />
        <CopyButton label="Copier en Markdown" onCopy={() => copyPlain(text)} />
        <button type="button" className="cta ghost" onClick={onClear}>Effacer</button>
      </div>
      <Markdown source={text} className="advice" />
    </div>
  );
}
