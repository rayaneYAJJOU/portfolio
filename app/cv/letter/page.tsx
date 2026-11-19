"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useHydrated } from "../../../lib/clientEnv";
import { copyPlain } from "../../../lib/clipboard";
import { extractStyle, letterPrompt, repairLetter, reviewLetter, writeLetter, type LetterInput } from "../../../lib/letter";
import { KEYS, useLocal, useProfile, writeStore } from "../../../lib/owner";
import { parseJson } from "../../../lib/store";
import { META, useAiStatus, useNow } from "../../../lib/providers";
import { cleanRole, detectLang, tailor } from "../../../lib/tailor";
import { useVault } from "../../../lib/vault";
import type { Lang } from "../../content";
import { CopyButton } from "../CopyBar";
import { UnlockBar } from "../UnlockBar";
import "../cv.css";
import "./letter.css";

type CvState = { jd?: string; company?: string; role?: string | null };
type Style = { samples?: string; guide?: string };

export default function LetterPage() {
  const hydrated = useHydrated();
  const { owner, data } = useProfile();
  const { state: vaultState } = useVault();
  const aiStatus = useAiStatus();
  const now = useNow();

  // L'offre vient de l'outil CV (/cv/) : même texte, même entreprise, même intitulé.
  const cvRaw = useLocal(KEYS.cv);
  const cv = useMemo(() => parseJson<CvState>(cvRaw) ?? {}, [cvRaw]);
  const styleRaw = useLocal(KEYS.style);
  const style = useMemo(() => parseJson<Style>(styleRaw) ?? {}, [styleRaw]);
  const draftRaw = useLocal(KEYS.letter);
  const draft = useMemo(() => parseJson<{ text?: string }>(draftRaw) ?? {}, [draftRaw]);

  const [langEdit, setLang] = useState<Lang | null>(null);
  const [roleEdit, setRole] = useState<string | null>(null);
  const [companyEdit, setCompany] = useState<string | null>(null);
  const [why, setWhy] = useState("");
  const [emphasis, setEmphasis] = useState("");
  const [textEdit, setTextEdit] = useState<string | null>(null);
  const [samplesEdit, setSamplesEdit] = useState<string | null>(null);
  const [guideEdit, setGuideEdit] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "write" | "repair" | "style" | "docx">("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const jd = cv.jd ?? "";
  const lang: Lang = langEdit ?? detectLang(jd) ?? "fr";
  const firstLine = jd.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "";
  const role = roleEdit ?? cv.role ?? (firstLine.length <= 80 ? cleanRole(firstLine) : "");
  const company = companyEdit ?? cv.company ?? "";
  const samples = samplesEdit ?? style.samples ?? "";
  const guide = guideEdit ?? style.guide ?? "";
  const text = textEdit ?? draft.text ?? "";

  const { report } = tailor({ lang, jd, targetRole: role, company, data, maxProjects: 3 });
  const input: LetterInput = {
    lang, jd, role, company, data, why, emphasis, styleGuide: guide, samples,
    matched: report.matched.map((t) => t.label),
    missing: report.missing.map((t) => t.label),
  };
  const review = reviewLetter(text, input);
  const wordCount = (text.match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;

  const hasAi = !!owner && Object.values(owner.keys).some(Boolean);
  const saveText = (v: string) => { setTextEdit(v); writeStore(KEYS.letter, JSON.stringify({ text: v })); };
  const saveStyle = (next: Style) => writeStore(KEYS.style, JSON.stringify({ samples, guide, ...next }));

  const run = async (kind: "write" | "repair" | "style", job: () => Promise<void>) => {
    setBusy(kind); setError(""); setNote("");
    try { await job(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(""); }
  };

  const generate = () =>
    owner && run("write", async () => {
      const r = await writeLetter(owner, input);
      saveText(r.text);
      setNote(r.repaired ? "Des tournures génériques ont été détectées puis corrigées automatiquement." : "");
    });

  const fix = () =>
    owner && run("repair", async () => {
      const r = await repairLetter(owner, input, text);
      saveText(r.text);
      setNote(r.review.slop.length ? "Il reste des tournures à reprendre à la main." : "Tournures génériques corrigées.");
    });

  const analyseStyle = () =>
    owner && run("style", async () => {
      const g = await extractStyle(owner, samples);
      setGuideEdit(g);
      saveStyle({ guide: g });
    });

  const downloadDocx = async () => {
    setBusy("docx");
    try {
      const [{ Packer }, { buildLetterDocx }] = await Promise.all([import("docx"), import("../../../lib/letterDocx")]);
      const blob = await Packer.toBlob(buildLetterDocx(text, { lang, name: data[lang].name, company }));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Rayane_Yajjou_Lettre_${(company || role || "candidature").replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "")}_${lang.toUpperCase()}.docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } finally { setBusy(""); }
  };

  if (!hydrated) return <div className="cvTool letterTool" />;

  if (!owner) {
    return (
      <div className="cvTool letterTool viewOnly">
        {vaultState === "locked" ? <UnlockBar /> : null}
        <div className="panel viewBar">
          <p className="hint">Outil réservé au propriétaire : {vaultState === "locked" ? "déverrouille le coffre ci-dessus." : <>configure l&apos;accès dans <Link href="/admin/">/admin/</Link>.</>}</p>
          <Link className="cta ghost" href="/">Portfolio</Link>
        </div>
      </div>
    );
  }

  const langToggle = (
    <div className="langToggle" role="group" aria-label="Langue de la lettre">
      {(["fr", "en"] as Lang[]).map((l) => (
        <button key={l} data-active={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
      ))}
    </div>
  );

  const paused = owner.providers.filter((c) => c.enabled && owner.keys[c.id] && (aiStatus.cool[c.id]?.until ?? 0) > now);

  return (
    <div className="cvTool letterTool">
      <aside className="panel">
        <Link href="/cv/" className="back">← CV adapté à une offre</Link>
        <h1>Lettre de motivation</h1>
        <p className="hint">
          Écrite à partir de ton profil réel et de l&apos;offre, avec une liste d&apos;interdits (formules toutes faites, enthousiasme inventé) et un détecteur qui relit le résultat. Plus ton style est renseigné, plus le texte sonne comme toi.
        </p>

        {!jd.trim() ? (
          <p className="warn">Aucune offre en mémoire. Colle-la d&apos;abord dans <Link href="/cv/">l&apos;outil CV</Link> : la lettre reprend la même offre, le même intitulé et la même entreprise.</p>
        ) : (
          <p className="hint small">Offre reprise de l&apos;outil CV : « {firstLine.slice(0, 70)}{firstLine.length > 70 ? "…" : ""} »</p>
        )}

        <div className="fieldRow">
          <label className="field">
            <span>Poste visé</span>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Data Scientist Intern" />
          </label>
          <label className="field">
            <span>Entreprise</span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nom" />
          </label>
        </div>
        <div className="field">
          <span>Langue de la lettre{langEdit === null && detectLang(jd) ? " (déduite de l'offre)" : ""}</span>
          {langToggle}
        </div>

        <label className="field">
          <span>Pourquoi ce poste ou cette entreprise ? Ta vraie raison (facultatif)</span>
          <textarea rows={3} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Ex. : j'ai utilisé leur bibliothèque open source pour mon projet X ; je veux travailler sur la maintenance prédictive après mon stage chez Amendis." />
        </label>
        <p className="hint small">Sans raison de ta part, la lettre n&apos;en invente pas : elle part de l&apos;adéquation entre les missions et ce que tu as fait.</p>
        <label className="field">
          <span>À mettre en avant (facultatif)</span>
          <input value={emphasis} onChange={(e) => setEmphasis(e.target.value)} placeholder="Ex. : le projet de segmentation 3D, mes bases en SQL" />
        </label>

        <details open={!samples.trim()}>
          <summary>Mon style d&apos;écriture {guide.trim() ? "(guide enregistré)" : samples.trim() ? "(textes enregistrés)" : ""}</summary>
          <label className="field">
            <span>Tes textes de référence : 1 à 3 lettres, mails ou rapports écrits par toi (FR et/ou EN)</span>
            <textarea rows={7} value={samples} onChange={(e) => { setSamplesEdit(e.target.value); saveStyle({ samples: e.target.value }); }} placeholder="Colle ici des textes que tu as vraiment écrits, sans les faire retoucher par une IA." />
          </label>
          <div className="actions">
            <button className="cta ghost" onClick={analyseStyle} disabled={!hasAi || samples.trim().length < 300 || !!busy}>{busy === "style" ? "Analyse…" : "Extraire mon style"}</button>
          </div>
          <p className="hint small">{samples.trim().length < 300 ? "Il faut au moins ~300 caractères pour que l'analyse ait un sens." : "Ces textes sont envoyés au fournisseur d'IA lors d'une génération. Ne colle rien de confidentiel."}</p>
          <label className="field">
            <span>Guide de style (modifiable, c&apos;est ce qui guide la voix)</span>
            <textarea rows={8} value={guide} onChange={(e) => { setGuideEdit(e.target.value); saveStyle({ guide: e.target.value }); }} placeholder="Rempli par « Extraire mon style », ou écris toi-même 5 à 8 règles : phrases courtes, vouvoiement, pas d'adjectifs, deux-points fréquents…" />
          </label>
        </details>

        <div className="actions">
          <button className="cta" onClick={generate} disabled={!hasAi || !jd.trim() || !!busy}>{busy === "write" ? "Rédaction…" : text.trim() ? "Régénérer" : "Générer la lettre"}</button>
          <CopyButton label="Copier le prompt (sans clé API)" onCopy={() => copyPlain(letterPrompt(input))} disabled={!jd.trim()} />
        </div>
        {!hasAi ? <p className="hint small">Pas de clé d&apos;IA : copie le prompt et colle-le dans Claude ou ChatGPT, puis colle la réponse à droite. Le contrôle fonctionne aussi sur un texte collé.</p> : (
          <p className="hint small">
            {aiStatus.last ? `Dernière réponse : ${META[aiStatus.last.id].label} · ${aiStatus.last.model}. ` : ""}
            {paused.map((c) => `${META[c.id].label} en pause (${aiStatus.cool[c.id]!.reason}). `).join("")}
            Le fournisseur se choisit dans <Link href="/cv/">/cv/</Link> ou <Link href="/admin/">/admin/</Link>.
          </p>
        )}
        {error ? <p className="warn">{error}</p> : null}
      </aside>

      <main className="stage letterStage">
        <div className="letterHead">
          <h2>Lettre {text.trim() ? `· ${wordCount} mots` : ""}</h2>
          <div className="actions">
            <CopyButton label="Copier" onCopy={() => copyPlain(text)} disabled={!text.trim()} />
            <button className="cta ghost" onClick={downloadDocx} disabled={!text.trim() || busy === "docx"}>DOCX</button>
            <button className="cta ghost" onClick={fix} disabled={!hasAi || !review.slop.length || !!busy}>{busy === "repair" ? "Correction…" : "Corriger les tournures"}</button>
          </div>
        </div>

        <textarea
          className="letterText"
          value={text}
          onChange={(e) => saveText(e.target.value)}
          placeholder="La lettre apparaît ici. Tu peux la modifier : le contrôle ci-dessous se met à jour à chaque frappe."
          spellCheck
          lang={lang}
        />

        {note ? <p className="ok">{note}</p> : null}
        {text.trim() ? (
          <section className="checks" aria-live="polite">
            <h3>Contrôle anti-cliché</h3>
            {review.slop.length === 0 ? <p className="ok">Aucune formule générique ni tic de texte généré détecté.</p> : (
              <div className="warn">
                <strong>{review.slop.length} point{review.slop.length > 1 ? "s" : ""} à reprendre :</strong>
                <ul>{review.slop.map((s) => <li key={s.message}>{s.message}</li>)}</ul>
              </div>
            )}
            <h3>Contrôle du profil</h3>
            {review.guard.length === 0 ? <p className="ok">Aucun outil ni chiffre absent de ton profil ou de l&apos;offre.</p> : (
              <div className="warn">
                <strong>À vérifier avant d&apos;envoyer :</strong>
                <ul>{review.guard.map((g) => <li key={g}>{g}</li>)}</ul>
              </div>
            )}
            <p className="hint small">Le détecteur repère des formules ; il ne juge pas la qualité. Relis à voix haute : si une phrase ne te ressemble pas, réécris-la.</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
