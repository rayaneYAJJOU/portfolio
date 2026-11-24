"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useHash, useHydrated } from "../../../lib/clientEnv";
import { copyPlain } from "../../../lib/clipboard";
import { KEYS, useLocal, useProfile, writeStore } from "../../../lib/owner";
import { isCustom, loadPrompts, missingVars, PROMPT_BY_ID, PROMPTS, promptText, type PromptDef, type PromptId, type SavedPrompts } from "../../../lib/prompts";
import { useVault } from "../../../lib/vault";
import { CopyButton } from "../CopyBar";
import { UnlockBar } from "../UnlockBar";
import "../cv.css";
import "./prompts.css";

const GROUPS: { id: PromptDef["group"]; title: string; hint: string }[] = [
  { id: "texte", title: "Lettre et messages", hint: "Lettre de motivation, e-mail, relance, LinkedIn, analyse de ton style." },
  { id: "cv", title: "CV et conseils", hint: "Reformulation, « Que dois-je améliorer ? », entretien, prompt à coller." },
  { id: "commun", title: "Règles communes", hint: "Insérées automatiquement dans les autres prompts." },
];

export default function PromptsPage() {
  const hydrated = useHydrated();
  const { owner } = useProfile();
  const { state: vaultState } = useVault();
  const hash = useHash();
  const raw = useLocal(KEYS.prompts);
  const saved = loadPrompts(raw);
  const [preview, setPreview] = useState<Partial<Record<PromptId, boolean>>>({});
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);

  // Enregistre uniquement ce qui diffère du défaut : si le défaut évolue plus tard, les prompts non modifiés suivent.
  const save = (next: SavedPrompts) => {
    const custom: SavedPrompts["custom"] = {};
    for (const p of PROMPTS) {
      const t = next.custom?.[p.id];
      if (typeof t === "string" && t.trim() !== "" && t !== p.text) custom[p.id] = t;
    }
    const clean: SavedPrompts = { ...(Object.keys(custom).length ? { custom } : {}), ...(next.extra?.trim() ? { extra: next.extra } : {}) };
    writeStore(KEYS.prompts, Object.keys(clean).length ? JSON.stringify(clean) : null);
  };
  const setText = (id: PromptId, t: string) => save({ ...saved, custom: { ...saved.custom, [id]: t } });
  const reset = (id: PromptId) => { const c = { ...saved.custom }; delete c[id]; save({ ...saved, custom: c }); };

  const exportJson = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" }));
    a.download = "prompts-personnalises.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importJson = async (f: File) => {
    try {
      const v = JSON.parse(await f.text()) as SavedPrompts;
      const custom: SavedPrompts["custom"] = {};
      for (const [k, t] of Object.entries(v.custom ?? {})) if (k in PROMPT_BY_ID && typeof t === "string") custom[k as PromptId] = t;
      save({ custom, extra: typeof v.extra === "string" ? v.extra : "" });
      setMsg(`Importé : ${Object.keys(custom).length} prompt(s) personnalisé(s).`);
    } catch {
      setMsg("Fichier illisible : ce n'est pas un export de prompts.");
    }
  };

  if (!hydrated) return <div className="cvTool promptsTool" />;
  if (!owner) {
    return (
      <div className="cvTool promptsTool viewOnly">
        {vaultState === "locked" ? <UnlockBar /> : null}
        <div className="panel viewBar">
          <p className="hint">Outil réservé au propriétaire : {vaultState === "locked" ? "déverrouille le coffre ci-dessus." : <>configure l&apos;accès dans <Link href="/admin/">/admin/</Link>.</>}</p>
          <Link className="cta ghost" href="/">Portfolio</Link>
        </div>
      </div>
    );
  }

  const nCustom = PROMPTS.filter((p) => isCustom(saved, p.id)).length;

  return (
    <div className="cvTool promptsTool">
      <main className="promptsMain">
        <Link href="/cv/" className="back">← CV adapté à une offre</Link>
        <h1>Prompts des IA</h1>
        <p className="hint">
          Ce que les IA reçoivent comme consignes. Chaque prompt a une valeur par défaut que tu peux rétablir en un clic.
          Les modifications restent dans ce navigateur. Le site ajoute toujours lui-même ce qui est décrit sous « Ajouté automatiquement » (données, offre, format de réponse attendu).
        </p>

        <section className="pCard">
          <h2>Mes consignes personnelles</h2>
          <p className="hint small">Ajoutées à la fin de tous les prompts (sauf la lecture d&apos;image). Pratique pour une préférence valable partout, sans éditer chaque prompt.</p>
          <textarea
            rows={4}
            value={saved.extra ?? ""}
            onChange={(e) => save({ ...saved, extra: e.target.value })}
            placeholder={"Ex. : Ne mentionne jamais mes notes. Préfère « stage » à « internship » en français. Garde un ton sobre."}
            aria-label="Consignes personnelles"
          />
        </section>

        {GROUPS.map((g) => (
          <section key={g.id} className="pGroup">
            <h2>{g.title}</h2>
            <p className="hint small">{g.hint}</p>
            {PROMPTS.filter((p) => p.group === g.id).map((p) => {
              const value = saved.custom?.[p.id] ?? p.text;
              const custom = isCustom(saved, p.id);
              const lost = missingVars(p.id, value);
              return (
                <details key={p.id} id={p.id} className="pCard" open={hash === `#${p.id}` ? true : undefined}>
                  <summary>
                    <span>{p.label}</span>
                    {custom ? <span className="badge">modifié</span> : null}
                  </summary>
                  <p className="hint small">{p.about}</p>
                  <textarea
                    rows={Math.min(24, Math.max(8, value.split("\n").length + 1))}
                    value={value}
                    onChange={(e) => setText(p.id, e.target.value)}
                    spellCheck={false}
                    aria-label={p.label}
                  />
                  {Object.keys(p.vars).length ? (
                    <p className="hint small vars">
                      Variables : {Object.entries(p.vars).map(([k, d]) => <span key={k}><code>{`{{${k}}}`}</code> {d}</span>)}
                    </p>
                  ) : null}
                  {p.fixed ? <p className="hint small"><strong>Ajouté automatiquement :</strong> {p.fixed}</p> : null}
                  {lost.length ? <p className="warn">Variable absente : {lost.map((v) => `{{${v}}}`).join(", ")}. La consigne correspondante ne sera plus envoyée.</p> : null}
                  <div className="actions">
                    <button className="cta ghost" onClick={() => reset(p.id)} disabled={!custom}>Rétablir le défaut</button>
                    <button className="cta ghost" onClick={() => setPreview((v) => ({ ...v, [p.id]: !v[p.id] }))}>{preview[p.id] ? "Masquer le prompt final" : "Voir le prompt final"}</button>
                    <CopyButton label="Copier" onCopy={() => copyPlain(promptText(p.id, p.sample ?? {}, saved))} />
                  </div>
                  {preview[p.id] ? <pre className="pPreview">{promptText(p.id, p.sample ?? {}, saved)}</pre> : null}
                </details>
              );
            })}
          </section>
        ))}

        <section className="pCard">
          <h2>Sauvegarde</h2>
          <p className="hint small">{nCustom} prompt(s) modifié(s). Les prompts vivent dans ce navigateur : exporte-les pour les garder ou les retrouver sur un autre appareil.</p>
          <div className="actions">
            <button className="cta ghost" onClick={exportJson}>Exporter (JSON)</button>
            <button className="cta ghost" onClick={() => file.current?.click()}>Importer…</button>
            <button className="cta ghost" disabled={!nCustom && !saved.extra} onClick={() => { if (window.confirm("Rétablir tous les prompts par défaut et effacer tes consignes personnelles ?")) { writeStore(KEYS.prompts, null); setMsg("Tout est rétabli par défaut."); } }}>Tout rétablir</button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />
          </div>
          {msg ? <p className="ok" aria-live="polite">{msg}</p> : null}
        </section>
      </main>
    </div>
  );
}
