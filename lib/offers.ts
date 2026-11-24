// Offres enregistrées (radar des écarts) + suivi de candidature. Tout reste dans ce navigateur.

export type Status = "todo" | "applied" | "interview" | "offer" | "rejected" | "dropped";

export const STATUSES: { id: Status; label: string }[] = [
  { id: "todo", label: "À postuler" },
  { id: "applied", label: "Envoyée" },
  { id: "interview", label: "Entretien" },
  { id: "offer", label: "Proposition" },
  { id: "rejected", label: "Refus" },
  { id: "dropped", label: "Abandonnée" },
];
export const statusLabel = (s?: Status) => STATUSES.find((x) => x.id === (s ?? "todo"))?.label ?? "À postuler";

export type SavedOffer = {
  id: string;
  date: string; // jour d'enregistrement (AAAA-MM-JJ)
  label: string;
  company?: string;
  role?: string;
  coverage: number | null;
  missing: { key: string; weight: number }[];
  text?: string;
  url?: string;
  status?: Status;
  appliedOn?: string;
  followUp?: string; // jour de relance prévu
  notes?: string;
};

export function parseOffers(raw: string): SavedOffer[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? (v as SavedOffer[]) : [];
  } catch {
    return [];
  }
}

/** Date locale AAAA-MM-JJ (pas UTC : « aujourd'hui » doit être le jour de l'utilisateur). */
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return ymd(new Date(y, m - 1, d + n));
}

/** Une candidature envoyée dont la date de relance est atteinte. */
export const needsFollowUp = (o: SavedOffer, today: string) => o.status === "applied" && !!o.followUp && o.followUp <= today;

/** Entreprise et poste d'une offre, y compris pour les anciennes entrées qui n'ont que `label` (« Entreprise – Poste »). */
export function partsOf(o: SavedOffer): { company: string; role: string } {
  if (o.company !== undefined || o.role !== undefined) return { company: o.company ?? "", role: o.role ?? "" };
  const [a, ...rest] = o.label.split(" – ");
  return rest.length ? { company: a, role: rest.join(" – ") } : { company: "", role: o.label };
}

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

/** CSV lisible directement par Excel (séparateur « ; », BOM UTF-8). */
export function offersToCsv(list: SavedOffer[]): string {
  const head = ["Entreprise", "Poste", "Statut", "Enregistrée le", "Envoyée le", "Relance prévue", "Couverture %", "Lien", "Notes"];
  const rows = list.map((o) => {
    const { company, role } = partsOf(o);
    return [company, role, statusLabel(o.status), o.date, o.appliedOn ?? "", o.followUp ?? "", o.coverage ?? "", o.url ?? "", o.notes ?? ""];
  });
  return "\ufeff" + [head, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
}
