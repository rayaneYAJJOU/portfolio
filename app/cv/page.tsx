"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearch, useStored } from "../../lib/clientEnv";
import type { Lang } from "../content";
import { cleanRole, detectLang, fitProjects, tailor, type CV, type CVEntry } from "../../lib/tailor";
import { cvToText } from "../../lib/cvText";
import { buildPrompt } from "../../lib/prompt";
import { IDEAS } from "../../lib/roadmap";
import { labelFor } from "../../lib/taxonomy";
import { SAMPLES } from "../../lib/samples";
import "./cv.css";

const STORE = "cv-tailor:v1";
const OFFERS = "cv-tailor:offers:v1";

type SavedOffer = { id: string; date: string; label: string; coverage: number | null; missing: { key: string; weight: number }[] };

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
      <p className="pContact">
        {cv.contact.map((c, i) => (
          <span key={c.text}>
            {i ? "  |  " : ""}
            {c.href && !c.href.startsWith("tel:") ? <a href={c.href}>{c.text}</a> : c.text}
          </span>
        ))}
      </p>
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
  const [, bump] = useState(0); // relance le rendu après écriture dans localStorage

  const q = useMemo(() => new URLSearchParams(search), [search]);
  const viewOnly = q.has("view");
  const urlLang = q.get("lang") === "fr" || q.get("lang") === "en" ? (q.get("lang") as Lang) : null;
  const savedRaw = useStored(STORE);
  const saved = useMemo(() => {
    try { return JSON.parse(savedRaw || "{}") as { jd?: string; company?: string; role?: string | null }; } catch { return {}; }
  }, [savedRaw]);

  const jd = viewOnly ? "" : (jdEdit ?? saved.jd ?? "");
  const company = viewOnly ? "" : (companyEdit ?? saved.company ?? "");
  const role = roleEdit ?? saved.role ?? null; // null = déduit de l'offre

  useEffect(() => {
    // N'écrit qu'après une saisie : le premier rendu (avant lecture du stockage) ne doit pas écraser la sauvegarde.
    if (viewOnly || (jdEdit === null && companyEdit === null && roleEdit === null)) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ jd, company, role }));
    } catch {}
  }, [viewOnly, jdEdit, companyEdit, roleEdit, jd, company, role]);

  const detected = useMemo(() => detectLang(jd), [jd]);
  const effLang: Lang = langEdit ?? urlLang ?? detected ?? "fr";
  const firstLine = jd.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "";
  const effRole = role ?? (firstLine.length <= 80 ? cleanRole(firstLine) : "");

  const base = useMemo(
    () => ({ lang: effLang, jd, targetRole: effRole, company, educationFirst, customSummary }),
    [effLang, jd, effRole, company, educationFirst, customSummary],
  );
  const autoProjects = useMemo(() => fitProjects(base), [base]);
  const maxProjects = maxEdit ?? autoProjects;
  const { cv, report } = useMemo(() => tailor({ ...base, maxProjects }), [base, maxProjects]);

  const offersRaw = useStored(OFFERS);
  const offers = useMemo<SavedOffer[]>(() => {
    try { return JSON.parse(offersRaw || "[]"); } catch { return []; }
  }, [offersRaw]);

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
    try { localStorage.setItem(OFFERS, JSON.stringify(list)); } catch {}
    bump((n) => n + 1);
  };
  const saveOffer = () => {
    const label = [company, effRole].filter(Boolean).join(" – ") || firstLine.slice(0, 60) || "Offre";
    writeOffers([
      ...offers.filter((o) => o.label !== label),
      { id: String(Date.now()), date: new Date().toISOString().slice(0, 10), label, coverage: report.coverage, missing: report.missing.map((t) => ({ key: t.key, weight: t.weight })) },
    ]);
  };

  const fileBase = `Rayane_Yajjou_CV_${(company || effRole || "general").replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "")}_${effLang.toUpperCase()}`;

  const printPdf = () => {
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

  const langToggle = (
    <div className="langToggle" role="group" aria-label="Langue du CV">
      {(["fr", "en"] as Lang[]).map((l) => (
        <button key={l} data-active={effLang === l} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  if (viewOnly) {
    return (
      <div className="cvTool viewOnly">
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
          Rien n&apos;est inventé : une compétence absente de <code>app/content.ts</code> n&apos;est jamais ajoutée.
        </p>

        <label className="field">
          <span>Offre d&apos;emploi (texte complet)</span>
          <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={10} placeholder="Colle ici la description du poste, missions et profil recherché inclus…" />
        </label>
        <div className="sampleRow">
          <button onClick={() => setJd(SAMPLES.fr_data)}>Exemple FR</button>
          <button onClick={() => setJd(SAMPLES.en_swe)}>Exemple EN</button>
          <button onClick={() => { setJd(""); setRole(null); setCompany(""); }}>Vider</button>
        </div>

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
        </div>
        <p className="hint small">PDF : dans la fenêtre d&apos;impression choisis « Enregistrer au format PDF ». Le texte reste sélectionnable, donc lisible par les ATS.</p>

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
              <p className="hint small">Ajoute un écart à <code>content.ts</code> uniquement si tu le maîtrises vraiment (projet, cours, stage). Sinon, laisse-le : mieux vaut un CV honnête qu&apos;un entretien raté.</p>
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
              <button className="cta ghost" onClick={() => writeOffers([])}>Effacer le radar</button>
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
