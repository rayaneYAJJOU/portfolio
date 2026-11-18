"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { content, type Entry, type Lang } from "../content";
import { DEFAULT_MODEL } from "../../lib/ai";
import { ghPutFile, ghVerify } from "../../lib/github";
import { KEYS, useDraft, useOwner, writeStore, type Data, type OwnerSettings } from "../../lib/owner";
import { validateProfile } from "../../lib/schema";
import "./admin.css";

const PATH = "data/profile.json";
const SECTIONS = ["experience", "education", "projects", "extra"] as const;
type Section = (typeof SECTIONS)[number];

// ───────── petits champs ─────────

function Text({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="f">
      <span>{label}</span>
      {rows ? <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} /> : <input value={value} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

// Champs « liste » : édition libre, validation à la sortie du champ (sinon la virgule finale serait mangée).
function List({ label, value, onCommit, mode }: { label: string; value: string[]; onCommit: (v: string[]) => void; mode: "lines" | "csv" }) {
  const joined = mode === "lines" ? value.join("\n") : value.join(", ");
  const [text, setText] = useState(joined);
  return (
    <label className="f">
      <span>{label}</span>
      <textarea
        key={joined}
        rows={mode === "lines" ? Math.max(2, value.length + 1) : 2}
        defaultValue={joined}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onCommit(text.split(mode === "lines" ? "\n" : ",").map((x) => x.trim()).filter(Boolean))}
      />
    </label>
  );
}

// ───────── connexion ─────────

function Login() {
  const [f, setF] = useState({ repo: "", branch: "main", ghToken: "", aiKey: "", model: DEFAULT_MODEL });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setMsg("");
    try {
      const repo = f.repo.trim() || guessRepo();
      const s: OwnerSettings = { ...f, repo };
      const name = await ghVerify(s);
      writeStore(KEYS.owner, JSON.stringify({ ...s, repo: name }));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm">
      <Link href="/" className="back">← Portfolio</Link>
      <h1>Accès propriétaire</h1>
      <p className="hint">
        Les visiteurs n&apos;ont accès qu&apos;au portfolio et au CV en lecture. Ici, tu te connectes avec un <strong>jeton GitHub</strong> limité à ce
        dépôt : il reste dans ce navigateur, n&apos;est jamais publié, et c&apos;est lui (pas ce formulaire) qui autorise les modifications.
      </p>
      <Text label="Dépôt (propriétaire/nom)" value={f.repo} onChange={set("repo")} />
      <Text label="Branche" value={f.branch} onChange={set("branch")} />
      <label className="f">
        <span>Jeton GitHub (fine-grained, Contents : Read and write, ce dépôt uniquement)</span>
        <input type="password" autoComplete="off" value={f.ghToken} onChange={(e) => set("ghToken")(e.target.value)} />
      </label>
      <label className="f">
        <span>Clé API Anthropic (optionnelle : assistant IA). Utilise une clé dédiée avec limite de dépense.</span>
        <input type="password" autoComplete="off" value={f.aiKey} onChange={(e) => set("aiKey")(e.target.value)} />
      </label>
      <Text label="Modèle" value={f.model} onChange={set("model")} />
      <div className="row">
        <button className="cta" onClick={submit} disabled={busy || !f.ghToken}>Vérifier et se connecter</button>
      </div>
      {msg ? <p className="warn">{msg}</p> : null}
    </div>
  );
}

function guessRepo(): string {
  const host = window.location.hostname;
  if (!host.endsWith(".github.io")) return "";
  const user = host.split(".")[0];
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/^\//, "");
  return `${user}/${base || `${user}.github.io`}`;
}

// ───────── bookmarklet ─────────

function Capture() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const base = window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? "");
    const js =
      "javascript:(()=>{try{var s=(getSelection()+'').trim();var m=document.querySelector('main,article,[role=main]');" +
      "var x=s||((m&&m.innerText.length>400?m.innerText:document.body.innerText)||'');x=x.slice(0,12000);" +
      "var d=JSON.stringify({x:x,t:document.title,u:location.href});" +
      "var b=btoa(unescape(encodeURIComponent(d))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');" +
      `window.open('${base}/cv/#import='+b,'_blank')}catch(e){alert('Import impossible : '+e)}})()`;
    // React bloque les href javascript: : on pose l'attribut directement dans le DOM.
    ref.current?.setAttribute("href", js);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCode(js);
  }, []);

  return (
    <section className="card">
      <h2>Importer une offre depuis n&apos;importe quel site</h2>
      <p className="hint">
        Glisse ce bouton dans ta barre de favoris : <a ref={ref} className="bm" onClick={(e) => e.preventDefault()}>→ Mon CV</a>. Sur une offre
        (LinkedIn, site d&apos;entreprise, Welcome to the Jungle…), <strong>sélectionne le texte de l&apos;offre</strong> puis clique le favori : l&apos;outil
        s&apos;ouvre avec l&apos;offre déjà collée. Sans sélection, c&apos;est la page entière qui est envoyée.
      </p>
      <p className="hint small">
        Ça marche aussi sur les pages derrière un compte, puisque le texte est lu dans ton navigateur. Si un site bloque les favoris : copie le texte
        à la main, ou colle/importe une capture d&apos;écran dans l&apos;outil (l&apos;IA en extrait le texte, utile pour un post ou un message).
      </p>
      <button className="cta ghost" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}>
        {copied ? "Copié ✓" : "Copier le code du favori"}
      </button>
    </section>
  );
}

// ───────── éditeur ─────────

function EntryEditor({ e, i, n, lang, sec, upd }: { e: Entry; i: number; n: number; lang: Lang; sec: Section; upd: (fn: (d: Data) => void) => void }) {
  const set = (fn: (x: Entry) => void) => upd((d) => fn(d[lang][sec].items[i]));
  const move = (dir: -1 | 1) =>
    upd((d) => {
      for (const l of ["fr", "en"] as Lang[]) {
        const a = d[l][sec].items;
        [a[i], a[i + dir]] = [a[i + dir], a[i]];
      }
    });
  const remove = () => {
    if (!window.confirm(`Supprimer « ${e.title} » (FR et EN) ?`)) return;
    upd((d) => { for (const l of ["fr", "en"] as Lang[]) d[l][sec].items.splice(i, 1); });
  };
  return (
    <details className="entry">
      <summary>{e.title || "(sans titre)"} <span className="muted">{e.period ?? ""}</span></summary>
      <Text label="Titre" value={e.title} onChange={(v) => set((x) => (x.title = v))} />
      <div className="two">
        <Text label="Rôle / diplôme" value={e.role ?? ""} onChange={(v) => set((x) => (x.role = v || undefined))} />
        <Text label="Contexte (module, équipe…)" value={e.context ?? ""} onChange={(v) => set((x) => (x.context = v || undefined))} />
        <Text label="Lieu" value={e.place ?? ""} onChange={(v) => set((x) => (x.place = v || undefined))} />
        <Text label="Période" value={e.period ?? ""} onChange={(v) => set((x) => (x.period = v || undefined))} />
      </div>
      <Text label="Texte du portfolio (1re personne)" rows={4} value={e.body} onChange={(v) => set((x) => (x.body = v))} />
      <List label="Puces du CV (une par ligne : verbe d'action, contexte, résultat chiffré si connu)" mode="lines" value={e.bullets} onCommit={(v) => set((x) => (x.bullets = v))} />
      <List label="Compétences / technologies (séparées par des virgules)" mode="csv" value={e.skills} onCommit={(v) => set((x) => (x.skills = v))} />
      <List
        label="Liens (une ligne : Libellé | https://…)"
        mode="lines"
        value={(e.links ?? []).map((l) => `${l.label} | ${l.href}`)}
        onCommit={(v) => set((x) => { const l = v.map((line) => { const [label, ...r] = line.split("|"); return { label: label.trim(), href: r.join("|").trim() }; }).filter((l) => l.href); x.links = l.length ? l : undefined; })}
      />
      <div className="row">
        <button className="cta ghost" disabled={i === 0} onClick={() => move(-1)}>↑</button>
        <button className="cta ghost" disabled={i === n - 1} onClick={() => move(1)}>↓</button>
        <button className="cta ghost danger" onClick={remove}>Supprimer</button>
      </div>
    </details>
  );
}

function Editor({ owner }: { owner: OwnerSettings }) {
  const draft = useDraft();
  const data: Data = draft ?? content;
  const [lang, setLang] = useState<Lang>("fr");
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [raw, setRaw] = useState<string | null>(null);
  const p = data[lang];
  const dirty = JSON.stringify(data) !== JSON.stringify(content);

  const upd = (fn: (d: Data) => void) => {
    const next = structuredClone(data);
    fn(next);
    writeStore(KEYS.draft, JSON.stringify(next));
  };

  const addEntry = (sec: Section) =>
    upd((d) => {
      const id = `e-${Date.now().toString(36)}`;
      d.fr[sec].items.unshift({ id, title: "Nouvelle entrée", body: "", bullets: [], skills: [] });
      d.en[sec].items.unshift({ id, title: "New entry", body: "", bullets: [], skills: [] });
    });

  const publish = async () => {
    const errs = validateProfile(data);
    if (errs.length) return setStatus({ kind: "err", text: errs.slice(0, 6).join(" · ") });
    setBusy(true);
    try {
      const url = await ghPutFile(owner, PATH, JSON.stringify(data, null, 2) + "\n", "Mise à jour du profil depuis /admin/");
      setStatus({ kind: "ok", text: `Publié. Le site se reconstruit (1 à 2 min). ${url}` });
    } catch (e) {
      setStatus({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="card">
        <div className="row spread">
          <h2>Contenu</h2>
          <div className="langToggle" role="group" aria-label="Langue éditée">
            {(["fr", "en"] as Lang[]).map((l) => (
              <button key={l} data-active={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <p className="hint small">
          Chaque modification est gardée en <strong>brouillon dans ce navigateur</strong> et visible par toi seul sur le portfolio et le CV. Rien n&apos;est
          en ligne tant que tu n&apos;as pas cliqué sur Publier. Les entrées (ajout, ordre, suppression) s&apos;appliquent à FR et EN ; les textes se
          modifient dans la langue sélectionnée.
        </p>

        <details open>
          <summary>Identité et disponibilité</summary>
          <Text label="Accroche" value={p.tagline} onChange={(v) => upd((d) => (d[lang].tagline = v))} />
          <Text label="Titre du CV" value={p.headline} onChange={(v) => upd((d) => (d[lang].headline = v))} />
          <Text label="Disponibilité (ex. durée, date de début)" value={p.availability} onChange={(v) => upd((d) => (d[lang].availability = v))} />
          <Text label="Profil (portfolio)" rows={4} value={p.profile.body} onChange={(v) => upd((d) => (d[lang].profile.body = v))} />
          <Text label="Résumé du CV (3 phrases, sans « je »)" rows={4} value={p.profile.cvSummary} onChange={(v) => upd((d) => (d[lang].profile.cvSummary = v))} />
        </details>

        <details>
          <summary>Compétences ({p.skillGroups.length} groupes)</summary>
          {p.skillGroups.map((g, i) => (
            <div className="group" key={i}>
              <Text label="Groupe" value={g.label} onChange={(v) => upd((d) => (d[lang].skillGroups[i].label = v))} />
              <List label="Éléments (virgules)" mode="csv" value={g.items} onCommit={(v) => upd((d) => (d[lang].skillGroups[i].items = v))} />
              <button className="cta ghost danger" onClick={() => upd((d) => d[lang].skillGroups.splice(i, 1))}>Supprimer le groupe</button>
            </div>
          ))}
          <button className="cta ghost" onClick={() => upd((d) => d[lang].skillGroups.push({ label: "Nouveau groupe", items: [] }))}>+ Groupe</button>
        </details>

        <details>
          <summary>En cours d&apos;apprentissage</summary>
          <p className="hint small">Uniquement ce que tu apprends réellement. Affiché sur le CV seulement si l&apos;offre le demande, sous « En cours d&apos;apprentissage ».</p>
          <List label="Une par ligne" mode="lines" value={p.learning ?? []} onCommit={(v) => upd((d) => (d[lang].learning = v))} />
        </details>

        {SECTIONS.map((sec) => (
          <details key={sec}>
            <summary>{p[sec].heading} ({p[sec].items.length})</summary>
            <button className="cta ghost" onClick={() => addEntry(sec)}>+ Ajouter</button>
            {p[sec].items.map((e, i) => (
              <EntryEditor key={e.id} e={e} i={i} n={p[sec].items.length} lang={lang} sec={sec} upd={upd} />
            ))}
          </details>
        ))}

        <details onToggle={(e) => e.currentTarget.open && setRaw(JSON.stringify(data, null, 2))}>
          <summary>Avancé : JSON complet</summary>
          <textarea className="raw" rows={14} value={raw ?? ""} onChange={(e) => setRaw(e.target.value)} />
          <button className="cta ghost" onClick={() => { try { upd((d) => Object.assign(d, JSON.parse(raw ?? "{}"))); setStatus({ kind: "ok", text: "JSON appliqué au brouillon." }); } catch { setStatus({ kind: "err", text: "JSON invalide." }); } }}>Appliquer au brouillon</button>
        </details>
      </section>

      <section className="card sticky">
        <div className="row">
          <button className="cta" disabled={busy || !dirty} onClick={publish}>{busy ? "Publication…" : "Publier sur le site"}</button>
          <Link href="/" className="cta ghost">Aperçu portfolio</Link>
          <Link href="/cv/" className="cta ghost">Outil CV</Link>
          {dirty ? <button className="cta ghost danger" onClick={() => window.confirm("Abandonner toutes les modifications non publiées ?") && writeStore(KEYS.draft, null)}>Abandonner le brouillon</button> : <span className="muted">Aucun brouillon : identique au site publié.</span>}
        </div>
        {status ? <p className={status.kind === "ok" ? "ok" : "warn"}>{status.text}</p> : null}
        <p className="hint small">Publier = un commit de <code>{PATH}</code> sur <code>{owner.repo}</code>. Pense à faire <code>git pull</code> avant de retravailler en local.</p>
      </section>
    </>
  );
}

export default function AdminPage() {
  const owner = useOwner();
  if (!owner) return <Login />;
  return (
    <div className="adm">
      <div className="row spread">
        <div>
          <Link href="/" className="back">← Portfolio</Link>
          <h1>Mode propriétaire</h1>
          <p className="hint small">
            {owner.repo} ({owner.branch}) · IA : {owner.aiKey ? owner.model : "non configurée"}
          </p>
        </div>
        <button className="cta ghost" onClick={() => writeStore(KEYS.owner, null)}>Se déconnecter</button>
      </div>
      <Editor owner={owner} />
      <Capture />
    </div>
  );
}
