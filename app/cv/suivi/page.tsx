"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "../../../lib/clientEnv";
import { addDays, needsFollowUp, offersToCsv, parseOffers, partsOf, STATUSES, ymd, type SavedOffer, type Status } from "../../../lib/offers";
import { KEYS, useLocal, useProfile, writeStore } from "../../../lib/owner";
import { useNow } from "../../../lib/providers";
import { useVault } from "../../../lib/vault";
import { UnlockBar } from "../UnlockBar";
import "../cv.css";
import "./suivi.css";

type Filter = "all" | "due" | Status;
const FOLLOW_UP_DAYS = 7;

export default function TrackerPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { owner } = useProfile();
  const { state: vaultState } = useVault();
  const now = useNow();
  const offers = parseOffers(useLocal(KEYS.offers));
  const [filter, setFilter] = useState<Filter>("all");
  const [add, setAdd] = useState({ company: "", role: "", url: "" });

  const today = ymd(new Date(now));
  const write = (list: SavedOffer[]) => writeStore(KEYS.offers, JSON.stringify(list));
  const patch = (id: string, p: Partial<SavedOffer>) => write(offers.map((o) => (o.id === id ? { ...o, ...p } : o)));

  const setStatus = (o: SavedOffer, status: Status) => {
    const p: Partial<SavedOffer> = { status };
    if (status === "applied") {
      p.appliedOn = o.appliedOn || today;
      p.followUp = o.followUp || addDays(p.appliedOn, FOLLOW_UP_DAYS); // relance proposée à J+7, modifiable
    }
    patch(o.id, p);
  };

  const addManual = () => {
    const { company, role, url } = add;
    if (!company.trim() && !role.trim()) return;
    const label = [company.trim(), role.trim()].filter(Boolean).join(" – ");
    write([...offers, { id: `m${now}-${offers.length}`, date: today, label, company: company.trim(), role: role.trim(), coverage: null, missing: [], url: url.trim() || undefined, status: "todo" }]);
    setAdd({ company: "", role: "", url: "" });
  };

  // Rouvre l'offre dans l'outil CV (même texte, même entreprise) pour régénérer le CV, la lettre ou la relance.
  const reopen = (o: SavedOffer, to: string) => {
    const { company, role } = partsOf(o);
    writeStore(KEYS.cv, JSON.stringify({ jd: o.text ?? "", company, role: role || null, source: o.url }));
    router.push(to);
  };

  const downloadCsv = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([offersToCsv(offers)], { type: "text/csv;charset=utf-8" }));
    a.download = `candidatures_${today}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  if (!hydrated) return <div className="cvTool trackerTool" />;
  if (!owner) {
    return (
      <div className="cvTool trackerTool viewOnly">
        {vaultState === "locked" ? <UnlockBar /> : null}
        <div className="panel viewBar">
          <p className="hint">Outil réservé au propriétaire : {vaultState === "locked" ? "déverrouille le coffre ci-dessus." : <>configure l&apos;accès dans <Link href="/admin/">/admin/</Link>.</>}</p>
          <Link className="cta ghost" href="/">Portfolio</Link>
        </div>
      </div>
    );
  }

  const due = offers.filter((o) => needsFollowUp(o, today));
  const count = (s: Status) => offers.filter((o) => (o.status ?? "todo") === s).length;
  const shown = offers
    .filter((o) => filter === "all" || (filter === "due" ? needsFollowUp(o, today) : (o.status ?? "todo") === filter))
    .sort((a, b) => Number(needsFollowUp(b, today)) - Number(needsFollowUp(a, today)) || b.date.localeCompare(a.date));

  return (
    <div className="cvTool trackerTool">
      <main className="trackerMain">
        <Link href="/cv/" className="back">← CV adapté à une offre</Link>
        <h1>Suivi des candidatures</h1>
        <p className="hint">Les offres enregistrées depuis l&apos;outil CV apparaissent ici. Quand tu passes une candidature à « Envoyée », une relance est proposée à J+{FOLLOW_UP_DAYS} (modifiable). Données conservées dans ce navigateur : exporte en CSV pour les garder.</p>

        {due.length ? (
          <div className="warn" role="status">
            <strong>{due.length} candidature{due.length > 1 ? "s" : ""} à relancer :</strong> {due.map((o) => partsOf(o).company || o.label).join(", ")}.
          </div>
        ) : null}

        <div className="chips" role="group" aria-label="Filtrer par statut">
          <button data-active={filter === "all"} onClick={() => setFilter("all")}>Toutes ({offers.length})</button>
          {due.length ? <button data-active={filter === "due"} data-due onClick={() => setFilter("due")}>À relancer ({due.length})</button> : null}
          {STATUSES.map((s) => <button key={s.id} data-active={filter === s.id} onClick={() => setFilter(s.id)}>{s.label} ({count(s.id)})</button>)}
        </div>

        <section className="tCard addForm">
          <h2>Ajouter une candidature</h2>
          <div className="fieldRow">
            <input placeholder="Entreprise" value={add.company} onChange={(e) => setAdd({ ...add, company: e.target.value })} aria-label="Entreprise" />
            <input placeholder="Poste" value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })} aria-label="Poste" />
          </div>
          <div className="fieldRow">
            <input placeholder="Lien de l'offre (facultatif)" value={add.url} onChange={(e) => setAdd({ ...add, url: e.target.value })} aria-label="Lien de l'offre" />
            <button className="cta" onClick={addManual} disabled={!add.company.trim() && !add.role.trim()}>Ajouter</button>
          </div>
        </section>

        {shown.length === 0 ? <p className="hint">{offers.length ? "Aucune candidature dans ce filtre." : "Rien pour l'instant : enregistre une offre depuis l'outil CV, ou ajoute-en une ci-dessus."}</p> : null}

        {shown.map((o) => {
          const { company, role } = partsOf(o);
          const isDue = needsFollowUp(o, today);
          return (
            <article key={o.id} className="tCard" data-due={isDue || undefined}>
              <header>
                <h3>{company ? <>{company} <span>· {role || "poste non précisé"}</span></> : role || o.label}</h3>
                <span className="hint small">
                  {o.coverage !== null ? `${o.coverage} % de couverture · ` : ""}enregistrée le {o.date}
                  {isDue ? " · " : ""}{isDue ? <strong className="dueTag">à relancer</strong> : null}
                </span>
              </header>
              <div className="trow">
                <label className="field"><span>Statut</span>
                  <select value={o.status ?? "todo"} onChange={(e) => setStatus(o, e.target.value as Status)}>
                    {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>
                <label className="field"><span>Envoyée le</span>
                  <input type="date" value={o.appliedOn ?? ""} onChange={(e) => patch(o.id, { appliedOn: e.target.value })} />
                </label>
                <label className="field"><span>Relance le</span>
                  <input type="date" value={o.followUp ?? ""} onChange={(e) => patch(o.id, { followUp: e.target.value })} />
                </label>
              </div>
              <textarea rows={2} placeholder="Notes : contact, date d'entretien, ce qui a été dit…" value={o.notes ?? ""} onChange={(e) => patch(o.id, { notes: e.target.value })} aria-label={`Notes pour ${o.label}`} />
              <div className="actions">
                {o.url ? <a className="cta ghost" href={o.url} target="_blank" rel="noreferrer noopener">Ouvrir l&apos;offre</a> : null}
                <button className="cta ghost" onClick={() => reopen(o, "/cv/")} disabled={!o.text}>Reprendre dans l&apos;outil CV</button>
                <button className="cta ghost" onClick={() => reopen(o, "/cv/letter/#followup")} disabled={!o.text}>Écrire la relance</button>
                <button className="cta ghost" onClick={() => { if (window.confirm(`Supprimer « ${o.label} » du suivi ?`)) write(offers.filter((x) => x.id !== o.id)); }}>Supprimer</button>
              </div>
            </article>
          );
        })}

        <div className="actions">
          <button className="cta ghost" onClick={downloadCsv} disabled={!offers.length}>Exporter en CSV</button>
        </div>
        <p className="hint small">Statuts : {STATUSES.map((s) => s.label).join(", ")}. {offers.length ? `${offers.length} offre(s) · dernière modification locale.` : ""}</p>
      </main>
    </div>
  );
}
