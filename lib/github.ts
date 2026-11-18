import type { Owner } from "./owner";

type Repo = Pick<Owner, "repo" | "branch" | "ghToken">;

// Persistance : un commit sur ton dépôt via l'API GitHub (jeton fin, limité à ce dépôt).
// Le workflow GitHub Pages republie ensuite le site tout seul.

const api = (s: Repo, path: string, init: RequestInit = {}) =>
  fetch(`https://api.github.com/repos/${s.repo}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${s.ghToken}`,
      ...(init.headers ?? {}),
    },
  });

const b64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};

async function fail(r: Response, what: string): Promise<never> {
  let detail = "";
  try { detail = (await r.json()).message ?? ""; } catch {}
  throw new Error(`${what} (${r.status})${detail ? " : " + detail : ""}`);
}

/** Vérifie que le jeton atteint le dépôt ET a le droit d'y écrire. */
export async function ghVerify(s: Repo): Promise<string> {
  const r = await api(s, "");
  if (!r.ok) return fail(r, "Dépôt inaccessible avec ce jeton");
  const j = await r.json();
  if (!j.permissions?.push) throw new Error("Le jeton n'a pas le droit d'écrire (Contents : Read and write requis).");
  return j.full_name as string;
}

export async function ghPutFile(s: Repo, path: string, text: string, message: string): Promise<string> {
  let sha: string | undefined;
  const get = await api(s, `/contents/${path}?ref=${encodeURIComponent(s.branch)}`);
  if (get.ok) sha = (await get.json()).sha;
  else if (get.status !== 404) return fail(get, "Lecture du fichier impossible");
  const put = await api(s, `/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: b64(text), branch: s.branch, ...(sha ? { sha } : {}) }),
  });
  if (!put.ok) return fail(put, "Publication refusée");
  return (await put.json()).commit?.html_url ?? "";
}
