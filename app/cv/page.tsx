"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useHash, useHydrated, useSearch } from "../../lib/clientEnv";
import { KEYS, notify, useLocal, useProfile, writeStore } from "../../lib/owner";
import { aiAdvise, aiExtractOffer, aiInterview, aiRewrite, type OfferMemo } from "../../lib/ai";
import { needsFollowUp, parseOffers, ymd, type SavedOffer } from "../../lib/offers";
import { checkRewrite } from "../../lib/guard";
import { META, useAiStatus, useNow } from "../../lib/providers";
import { useVault } from "../../lib/vault";
import type { Lang } from "../content";
import { cleanRole, contactLines, detectLang, fitProjects, tailor, type CV, type CVEntry } from "../../lib/tailor";
import { cvToText } from "../../lib/cvText";
import { buildPrompt } from "../../lib/prompt";
import { IDEAS } from "../../lib/roadmap";
import { labelFor } from "../../lib/taxonomy";
import { SAMPLES } from "../../lib/samples";
import { AdviceView } from "./AdviceView";
import { UnlockBar } from "./UnlockBar";
import "./cv.css";

const STORE = KEYS.cv;
const OFFERS = KEYS.offers;

// Import depuis le favori : #import=<base64url(JSON {x: texte, t: titre, u: url})>
function decodeImport(hash: string): { x: string; t?: string; u?: string } | null {
  if (!hash.startsWith("#import=")) return null;
  try {
    const b = hash.slice(8).replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b + "=".repeat((4 - (b.length % 4)) % 4));
    const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    return typeof o.x === "string" ? o : null;
  } catch {
    return null;
  }
}

const fileToBase64 = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(new Error("Lecture du fichier impossible"));
    r.readAsDataURL(f);
  });

function Entries({ list }: { list: CVEntry[] }) {
  return (
    <>
      {list.map((e) => (
        <div className="pEntry" key={e.id}>
          <div className="pRow">
            <span>{e.heading}</span>
            {e.period ? <span className="pPeriod">{e.period}</span> : null}
          </div>
          {e.subheading ? <div className="pSub">{e.subheading}</div> : null}
          {e.bullets.length ? (
            <ul>
              {e.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </>
  );
}

// Aperçu : une colonne, vrais titres/listes, aucune table ni image → lisible par les ATS une fois exporté en PDF.
function Paper({ cv }: { cv: CV }) {
  const exp = cv.experience.length ? (
    <section>
      <h2>{cv.labels.experience}</h2>
      <Entries list={cv.experience} />
    </section>
  ) : null;
  const edu = (
    <section>
      <h2>{cv.labels.education}</h2>
      <Entries list={cv.education} />
    </section>
  );
  return (
    <article className="paper" lang={cv.lang}>
      <h1>{cv.name}</h1>
      <p className="pHeadline">{cv.headline}</p>
      {contactLines(cv).map((line, n) => (
        <p className="pContact" key={n}>
          {line.map((c, i) => (
            <span key={c.text}>
              {i ? " | " : ""}
              {c.href && !c.href.startsWith("tel:") ? <a href={c.href}>{c.text}</a> : c.text}
            </span>
          ))}
        </p>
      ))}
      <p className="pAvail">{cv.availability}</p>
      <section>
        <h2>{cv.labels.summary}</h2>
        <p>{cv.summary}</p>
      </section>
      <section>
        <h2>{cv.labels.skills}</h2>
        {cv.skills.map((g) => (
          <p className="pSkill" key={g.label}>
            <strong>{g.label} : </strong>
            {g.items.join(", ")}
          </p>
        ))}
      </section>
      {cv.educationFirst ? edu : null}
      {exp}
      <section>
        <h2>{cv.labels.projects}</h2>
        <Entries list={cv.projects} />
      </section>
      {cv.educationFirst ? null : edu}
      <section>
        <h2>{cv.labels.extra}</h2>
        <Entries list={cv.extra} />
      </section>
      <section>
        <h2>{cv.labels.languages}</h2>
        <p>{cv.languages}</p>
      </section>
    </article>
  );
}

export default function CvPage() {
  const search = useSearch();
  // Saisies : null = pas encore modifié par l'utilisateur (on retombe sur la sauvegarde locale, puis sur la valeur déduite).
  const [jdEdit, setJd] = useState<string | null>(null);
  const [companyEdit, setCompany] = useState<string | null>(null);
  const [roleEdit, setRole] = useState<string | null>(null);
  const [langEdit, setLang] = useState<Lang | null>(null);
  const [maxEdit, setMaxProjects] = useState<number | null>(null); // null = auto (tient sur une page)
  const [educationFirst, setEducationFirst] = useState(false);
  const [customSummary, setCustomSummary] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string[]> | undefined>(undefined);
  const [aiBusy, setAiBusy] = useState<"" | "rewrite" | "advise" | "interview" | "image">("");
  const [aiError, setAiError] = useState("");
  const [aiNotes, setAiNotes] = useState("");
  const [aiIssues, setAiIssues] = useState<string[]>([]);
  const { owner, data } = useProfile();
  const hash = useHash();
  const { state: vaultState } = useVault();
  const aiStatus = useAiStatus();
  const now = useNow();
  const hydrated = useHydrated();
  const advice = useLocal(KEYS.advice);
  const interview = useLocal(KEYS.interview);

  const q = useMemo(() => new URLSearchParams(search), [search]);
  const viewOnly = q.has("view") || !owner; // les visiteurs n'ont que la vue lecture
  const urlLang = q.get("lang") === "fr" || q.get("lang") === "en" ? (q.get("lang") as Lang) : null;
  const savedRaw = useLocal(STORE);
  const saved = useMemo(() => {
    try { return JSON.parse(savedRaw || "{}") as { jd?: string; company?: string; role?: string | null; source?: string; title?: string }; } catch { return {}; }
  }, [savedRaw]);

  const imp = useMemo(() => decodeImport(hash), [hash]);
  const jd = viewOnly ? "" : (jdEdit ?? imp?.x ?? saved.jd ?? "");
  const source = jdEdit === null ? (imp?.u ?? saved.source) : undefined;
  const company = viewOnly ? "" : (companyEdit ?? saved.company ?? "");
  const role = roleEdit ?? saved.role ?? null; // null = déduit de l'offre

  useEffect(() => {
    // N'écrit qu'après une saisie : le premier rendu (avant lecture du stockage) ne doit pas écraser la sauvegarde.
    if (viewOnly || (jdEdit === null && companyEdit === null && roleEdit === null)) return;
    writeStore(STORE, JSON.stringify({ jd, company, role, source }));
  }, [viewOnly, jdEdit, companyEdit, roleEdit, jd, company, role, source]);

  // Offre envoyée par le favori : on la mémorise (propriétaire seulement) puis on efface l'URL.
  useEffect(() => {
    if (!hydrated || vaultState === "locked" || !hash.startsWith("#import=")) return; // verrouillé : on garde l'offre jusqu'au déverrouillage
    if (owner && imp) writeStore(STORE, JSON.stringify({ jd: imp.x, company: "", role: null, source: imp.u, title: imp.t }));
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    notify();
  }, [hydrated, vaultState, hash, imp, owner]);

  const detected = useMemo(() => detectLang(jd), [jd]);
  const effLang: Lang = langEdit ?? urlLang ?? detected ?? "fr";
  const firstLine = jd.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "";
  const effRole = role ?? (firstLine.length <= 80 ? cleanRole(firstLine) : "");

  const base = useMemo(
    () => ({ lang: effLang, jd, targetRole: effRole, company, educationFirst, customSummary, data, bulletOverrides: overrides }),
    [effLang, jd, effRole, company, educationFirst, customSummary, data, overrides],
  );
  const autoProjects = useMemo(() => fitProjects(base), [base]);
  const maxProjects = maxEdit ?? autoProjects;
  const { cv, report } = useMemo(() => tailor({ ...base, maxProjects }), [base, maxProjects]);

  const offersRaw = useLocal(OFFERS);
  const offers = useMemo<SavedOffer[]>(() => parseOffers(offersRaw), [offersRaw]);
  const dueCount = offers.filter((o) => needsFollowUp(o, ymd(new Date(now)))).length;

  // Radar : écarts agrégés sur toutes les offres enregistrées (ce qui revient le plus = ce qu'il faut apprendre).
  const radar = useMemo(() => {
    const acc = new Map<string, { n: number; w: number }>();
    for (const o of offers) for (const m of o.missing) {
      const a = acc.get(m.key) ?? { n: 0, w: 0 };
      acc.set(m.key, { n: a.n + 1, w: a.w + m.weight });
    }
    return [...acc].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.n - a.n || b.w - a.w).slice(0, 8);
  }, [offers]);

  const writeOffers = (list: SavedOffer[]) => {
    writeStore(OFFERS, JSON.stringify(list));
  };
  const saveOffer = () => {
    const label = [company, effRole].filter(Boolean).join(" – ") || firstLine.slice(0, 60) || "Offre";
    const prev = offers.find((o) => o.label === label); // ré-enregistrer met l'offre à jour sans perdre le suivi (statut, relance, notes)
    writeOffers([
      ...offers.filter((o) => o.label !== label),
      {
        ...prev,
        id: prev?.id ?? String(Date.now()),
        date: prev?.date ?? ymd(new Date()),
        label, company, role: effRole,
        coverage: report.coverage,
        missing: report.missing.map((t) => ({ key: t.key, weight: t.weight })),
        text: jd.slice(0, 4000), url: source,
        status: prev?.status ?? "todo",
      },
    ]);
  };

  const fileBase = `Rayane_Yajjou_CV_${(company || effRole || "general").replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "")}_${effLang.toUpperCase()}`;

  const printPdf = async () => {
    // Impression seulement quand la police du CV est chargée : sinon le PDF serait rendu avec une police de remplacement.
    try { await Promise.all(["400", "700", "italic 400"].map((w) => document.fonts.load(`${w} 9pt "CV Sans"`))); await document.fonts.ready; } catch {}
    const prev = document.title;
    document.title = fileBase; // nom de fichier proposé par le navigateur
    const restore = () => { document.title = prev; window.removeEventListener("afterprint", restore); };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  const downloadDocx = async () => {
    setBusy(true);
    try {
      const [{ Packer }, { buildDocx }] = await Promise.all([import("docx"), import("../../lib/docxExport")]);
      const blob = await Packer.toBlob(buildDocx(cv));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${fileBase}.docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } finally {
      setBusy(false);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(cvToText(cv));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildPrompt(cv, jd, report));
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {}
  };

  const runAi = async (kind: "rewrite" | "advise" | "interview" | "image", job: () => Promise<void>) => {
    setAiBusy(kind);
    setAiError("");
    try { await job(); } catch (e) { setAiError(e instanceof Error ? e.message : String(e)); } finally { setAiBusy(""); }
  };

  const hasAi = !!owner && Object.values(owner.keys).some(Boolean);
  const pickProvider = (v: string) => {
    if (!owner) return;
    const { ghToken, keys, ...settings } = owner;
    void ghToken; void keys;
    writeStore(KEYS.owner, JSON.stringify(v === "auto" ? { ...settings, mode: "auto" } : { ...settings, mode: "manual", selected: v }));
  };

  const doRewrite = () =>
    owner && runAi("rewrite", async () => {
      const r = await aiRewrite(owner, cv, jd, report);
      setCustomSummary(r.summary);
      setOverrides(r.bullets);
      setAiNotes(r.notes);
      setAiIssues(checkRewrite([r.summary, ...Object.values(r.bullets).flat()], data, effLang));
    });

  const undoRewrite = () => { setOverrides(undefined); setCustomSummary(""); setAiNotes(""); setAiIssues([]); };

  const doAdvise = () =>
    owner && runAi("advise", async () => {
      const memos: OfferMemo[] = offers.map((o) => ({ label: o.label, date: o.date, missing: o.missing, text: o.text, url: o.url }));
      writeStore(KEYS.advice, await aiAdvise(owner, data, memos, (k) => labelFor(k, "fr")));
    });

  const doInterview = () =>
    owner && runAi("interview", async () => {
      writeStore(KEYS.interview, await aiInterview(owner, data, cv, jd, report));
    });

  const doImage = (file: File) =>
    owner && runAi("image", async () => {
      setJd(await aiExtractOffer(owner, file.type || "image/png", await fileToBase64(file)));
    });

  const langToggle = (
    <div className="langToggle" role="group" aria-label="Langue du CV">
      {(["fr", "en"] as Lang[]).map((l) => (
        <button key={l} data-active={effLang === l} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  if (viewOnly || !owner) {
    return (
      <div className="cvTool viewOnly">
        {vaultState === "locked" ? <UnlockBar /> : null}
        <div className="panel viewBar">
          {langToggle}
          <button className="cta" onClick={printPdf}>PDF</button>
          <button className="cta ghost" onClick={downloadDocx} disabled={busy}>DOCX</button>
          <Link className="cta ghost" href="/">Portfolio</Link>
        </div>
        <Paper cv={cv} />
      </div>
    );
  }

  const pct = report.coverage;
  return (
    <div className="cvTool">
      <aside className="panel">
        <Link href="/" className="back">← Portfolio</Link>
        <h1>CV adapté à une offre</h1>
        <p className="hint">
          Colle l&apos;offre : le CV réordonne et met en avant ce qui, dans ton profil réel, correspond au poste.
          Rien n&apos;est inventé : une compétence absente de ton profil (<Link href="/admin/">/admin/</Link>) n&apos;est jamais ajoutée.
        </p>

        <label className="field">
          <span>Offre d&apos;emploi{aiBusy === "image" ? " : lecture de la capture…" : ""}</span>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            onPaste={(e) => {
              const img = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
              if (img) { e.preventDefault(); doImage(img); }
            }}
            rows={10}
            placeholder="Colle le texte de l'offre (ou une capture d'écran : Ctrl+V), ou utilise le favori « → Mon CV » depuis n'importe quel site."
          />
        </label>
        <div className="sampleRow">
          <button onClick={() => setJd(SAMPLES.fr_data)}>Exemple FR</button>
          <button onClick={() => setJd(SAMPLES.en_swe)}>Exemple EN</button>
          <button onClick={() => { setJd(""); setRole(null); setCompany(""); }}>Vider</button>
          <label className="fileBtn">Importer une capture<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) doImage(f); e.target.value = ""; }} /></label>
        </div>
        {source ? <p className="hint small">Source : <a href={source} target="_blank" rel="noreferrer">{source.replace(/^https?:\/\//, "").slice(0, 70)}</a></p> : null}

        <div className="fieldRow">
          <label className="field">
            <span>Intitulé du poste visé</span>
            <input value={effRole} onChange={(e) => setRole(e.target.value)} placeholder="Data Scientist Intern" />
          </label>
          <label className="field">
            <span>Entreprise (optionnel)</span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nom" />
          </label>
        </div>

        <div className="fieldRow">
          <div className="field">
            <span>Langue du CV{langEdit === null && urlLang === null && detected ? " (déduite de l'offre)" : ""}</span>
            {langToggle}
          </div>
          <label className="field">
            <span>Projets affichés : {maxProjects}{maxEdit === null ? " (auto, 1 page)" : ""}</span>
            <input type="range" min={1} max={6} value={maxProjects} onChange={(e) => setMaxProjects(Number(e.target.value))} />
          </label>
        </div>

        <label className="check">
          <input type="checkbox" checked={educationFirst} onChange={(e) => setEducationFirst(e.target.checked)} />
          Formation avant l&apos;expérience
        </label>

        <details>
          <summary>Remplacer le résumé</summary>
          <textarea value={customSummary} onChange={(e) => setCustomSummary(e.target.value)} rows={4} placeholder="Laisse vide pour le résumé généré. Reste factuel." />
        </details>

        <div className="actions">
          <button className="cta" onClick={printPdf}>Exporter en PDF</button>
          <button className="cta ghost" onClick={downloadDocx} disabled={busy}>DOCX</button>
          <button className="cta ghost" onClick={copyText}>{copied ? "Copié ✓" : "Copier le texte"}</button>
          <button className="cta ghost" onClick={copyPrompt} disabled={!jd.trim()}>{copiedPrompt ? "Copié ✓" : "Prompt pour Claude"}</button>
          <Link className="cta ghost" href="/cv/letter/">Lettre de motivation →</Link>
        </div>
        <p className="hint small">PDF : dans la fenêtre d&apos;impression choisis « Enregistrer au format PDF ». Le texte reste sélectionnable, donc lisible par les ATS.</p>

        <section className="report ai">
          <h2>Assistant IA</h2>
          {!hasAi ? <p className="hint small">Ajoute au moins une clé d&apos;IA dans <Link href="/admin/">/admin/</Link> pour activer l&apos;assistant.</p> : (
            <>
              <label className="field">
                <span>Fournisseur</span>
                <select value={owner.mode === "auto" ? "auto" : owner.selected} onChange={(e) => pickProvider(e.target.value)}>
                  <option value="auto">Automatique : ordre de /admin/, bascule à l&apos;épuisement</option>
                  {owner.providers.filter((c) => owner.keys[c.id]).map((c) => <option key={c.id} value={c.id}>{META[c.id].label}</option>)}
                </select>
              </label>
              <p className="hint small">
                {aiStatus.last ? `Dernière réponse : ${META[aiStatus.last.id].label} · ${aiStatus.last.model}. ` : ""}
                {owner.providers.filter((c) => c.enabled && owner.keys[c.id] && (aiStatus.cool[c.id]?.until ?? 0) > now).map((c) => `${META[c.id].label} en pause (${aiStatus.cool[c.id]!.reason}). `).join("")}
              </p>
            </>
          )}
          <div className="actions">
            <button className="cta ghost" onClick={doRewrite} disabled={!hasAi || !jd.trim() || !!aiBusy}>{aiBusy === "rewrite" ? "Réécriture…" : "Reformuler pour cette offre"}</button>
            {overrides ? <button className="cta ghost" onClick={undoRewrite}>Annuler la réécriture</button> : null}
            <button className="cta ghost" onClick={doAdvise} disabled={!hasAi || !!aiBusy}>{aiBusy === "advise" ? "Analyse…" : "Que dois-je améliorer ?"}</button>
            <button className="cta ghost" onClick={doInterview} disabled={!hasAi || !jd.trim() || !!aiBusy}>{aiBusy === "interview" ? "Préparation…" : "Préparer l'entretien"}</button>
          </div>
          <p className="hint small">
            <Link href="/cv/suivi/">Suivi des candidatures{dueCount ? ` · ${dueCount} à relancer` : ""}</Link> · <Link href="/cv/prompts/">Modifier les prompts</Link>
          </p>
          {aiError ? <p className="warn">{aiError}</p> : null}
          {aiNotes ? <p className="hint small">{aiNotes}</p> : null}
          {aiIssues.length ? (
            <div className="warn">
              <strong>À vérifier avant d&apos;envoyer :</strong>
              <ul>{aiIssues.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ) : overrides ? <p className="ok">Contrôle : aucun outil ni chiffre ajouté par rapport à ton profil.</p> : null}
          {advice ? <AdviceView text={advice} onClear={() => writeStore(KEYS.advice, null)} /> : null}
          {interview ? <AdviceView title="Préparation d'entretien" text={interview} onClear={() => writeStore(KEYS.interview, null)} /> : null}
        </section>

        <section className="report" aria-live="polite">
          <h2>Correspondance avec l&apos;offre</h2>
          {report.warnings.map((w) => (
            <p className="warn" key={w}>{w}</p>
          ))}
          {pct !== null ? (
            <>
              <div className="meter" role="img" aria-label={`${pct} %`}>
                <div style={{ width: `${pct}%` }} />
              </div>
              <p className="hint small">
                {pct} % du poids des compétences <em>reconnues</em> dans l&apos;offre figurent dans ton profil. Estimation sur mots-clés, pas le score d&apos;un vrai ATS.
              </p>
              <h3>Couvert</h3>
              <div className="chipRow">
                {report.matched.map((t) => (<span className="chip ok" key={t.key}>{t.label}</span>))}
                {report.matched.length === 0 ? <span className="hint small">Aucun</span> : null}
              </div>
              <h3>Écarts</h3>
              <div className="chipRow">
                {report.missing.map((t) => (<span className="chip gap" key={t.key}>{t.label}</span>))}
                {report.missing.length === 0 ? <span className="hint small">Aucun</span> : null}
              </div>
              <p className="hint small">Ajoute un écart à ton profil (/admin/) uniquement si tu le maîtrises vraiment (projet, cours, stage). Sinon, laisse-le : mieux vaut un CV honnête qu&apos;un entretien raté.</p>
              {report.otherTerms.length ? (
                <>
                  <h3>Autres termes répétés dans l&apos;offre</h3>
                  <div className="chipRow">
                    {report.otherTerms.map((t) => (<span className="chip" key={t}>{t}</span>))}
                  </div>
                </>
              ) : null}
            </>
          ) : null}
          {pct !== null ? (
            <button className="cta ghost" onClick={saveOffer}>Enregistrer cette offre</button>
          ) : null}
        </section>

        <section className="report">
          <h2>Radar des écarts ({offers.length} offre{offers.length > 1 ? "s" : ""})</h2>
          {radar.length === 0 ? (
            <p className="hint small">Enregistre les offres qui t&apos;intéressent : ici apparaîtront les compétences qui reviennent le plus et que ton profil n&apos;a pas, donc quoi apprendre en priorité.</p>
          ) : (
            <>
              <ol className="radar">
                {radar.map((r) => (
                  <li key={r.key}>
                    <strong>{labelFor(r.key, effLang)}</strong> <span className="hint small">· {r.n}/{offers.length} offre{offers.length > 1 ? "s" : ""}</span>
                    {IDEAS[r.key] ? <div className="hint small">{IDEAS[r.key]}</div> : null}
                  </li>
                ))}
              </ol>
              <p className="hint small">Les enregistrements restent dans ce navigateur uniquement.</p>
              <button className="cta ghost" onClick={() => { if (window.confirm("Effacer toutes les offres enregistrées ? Cela supprime aussi le suivi des candidatures (statuts, relances, notes).")) writeOffers([]); }}>Effacer les offres</button>
            </>
          )}
        </section>
      </aside>
      <main className="stage">
        <Paper cv={cv} />
      </main>
    </div>
  );
}
