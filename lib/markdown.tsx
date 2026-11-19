import type { ReactNode } from "react";

// Mini moteur Markdown, sans dépendance : les modèles répondent presque toujours en Markdown
// (titres, listes, gras, tableaux). On parse une fois en arbre, puis trois sorties :
//   - <Markdown> : éléments React (aucun innerHTML, donc rien d'injectable)
//   - mdToHtml   : HTML pour coller avec la mise en forme (Word, Docs, Notion, mail…)
//   - mdToPlain  : texte brut propre, sans symboles Markdown

type Inline =
  | { t: "text"; v: string }
  | { t: "b" | "i" | "code"; c: Inline[] }
  | { t: "a"; href: string; c: Inline[] };

type Item = { c: Inline[]; kids: Block[] };
export type Block =
  | { t: "h"; level: number; c: Inline[] }
  | { t: "p"; c: Inline[] }
  | { t: "ul" | "ol"; items: Item[] }
  | { t: "quote"; c: Block[] }
  | { t: "code"; v: string }
  | { t: "hr" }
  | { t: "table"; head: Inline[][]; rows: Inline[][][] };

// ───────── inline ─────────

const SAFE_URL = /^(https?:\/\/|mailto:)/i;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let buf = "";
  const flush = () => { if (buf) { out.push({ t: "text", v: buf }); buf = ""; } };
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\" && i + 1 < src.length && /[\\`*_{}[\]()#+\-.!|>]/.test(src[i + 1])) { buf += src[i + 1]; i += 2; continue; }
    if (ch === "`") {
      const end = src.indexOf("`", i + 1);
      if (end > i) { flush(); out.push({ t: "code", c: [{ t: "text", v: src.slice(i + 1, end) }] }); i = end + 1; continue; }
    }
    if ((src.startsWith("**", i) || src.startsWith("__", i)) && src[i + 2] && !/\s/.test(src[i + 2])) {
      const m = src.slice(i, i + 2);
      const end = src.indexOf(m, i + 2);
      if (end > i + 2) { flush(); out.push({ t: "b", c: parseInline(src.slice(i + 2, end)) }); i = end + 2; continue; }
    }
    if ((ch === "*" || ch === "_") && src[i + 1] && !/[\s*_]/.test(src[i + 1])) {
      let end = i + 1;
      while ((end = src.indexOf(ch, end)) !== -1 && (/\s/.test(src[end - 1]) || (ch === "_" && /\w/.test(src[end + 1] ?? "")))) end++;
      if (end > i + 1 && (ch === "*" || !/\w/.test(src[i - 1] ?? ""))) { flush(); out.push({ t: "i", c: parseInline(src.slice(i + 1, end)) }); i = end + 1; continue; }
    }
    if (ch === "[") {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(src.slice(i));
      if (m && SAFE_URL.test(m[2])) { flush(); out.push({ t: "a", href: m[2], c: parseInline(m[1]) }); i += m[0].length; continue; }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

// ───────── blocs ─────────

const LIST_RE = /^(\s*)([-*+•]|\d+[.)])\s+(.*)$/;
const isTableSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l) && l.includes("-");
const cells = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

export function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  return parseBlocks(lines);
}

function parseBlocks(lines: string[]): Block[] {
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = /^\s*```/.exec(line);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push({ t: "code", v: body.join("\n") });
      continue;
    }

    const h = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) { out.push({ t: "h", level: h[1].length, c: parseInline(h[2]) }); i++; continue; }

    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push({ t: "hr" }); i++; continue; }

    if (/^\s*>/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push({ t: "quote", c: parseBlocks(body) });
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line).map(parseInline);
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) rows.push(cells(lines[i++]).map(parseInline));
      out.push({ t: "table", head, rows });
      continue;
    }

    if (LIST_RE.test(line)) {
      const base = LIST_RE.exec(line)![1].length;
      const ordered = /\d/.test(LIST_RE.exec(line)![2]);
      const items: Item[] = [];
      while (i < lines.length) {
        const m = LIST_RE.exec(lines[i]);
        if (!m || m[1].length < base) break;
        if (m[1].length > base) {
          // sous-liste : rattachée au dernier élément
          const sub: string[] = [];
          while (i < lines.length && (LIST_RE.exec(lines[i])?.[1].length ?? 0) > base) sub.push(lines[i++]);
          items[items.length - 1]?.kids.push(...parseBlocks(sub));
          continue;
        }
        if (/\d/.test(m[2]) !== ordered) break;
        const text = [m[3]];
        i++;
        // ligne de continuation (retrait, sans puce)
        while (i < lines.length && lines[i].trim() && !LIST_RE.test(lines[i]) && /^\s{2,}\S/.test(lines[i])) text.push(lines[i++].trim());
        items.push({ c: parseInline(text.join(" ")), kids: [] });
      }
      out.push({ t: ordered ? "ol" : "ul", items });
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim() && !/^\s{0,3}#{1,6}\s/.test(lines[i]) && !/^\s*```/.test(lines[i]) &&
      !LIST_RE.test(lines[i]) && !/^\s*>/.test(lines[i]) && !/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(lines[i])
    ) para.push(lines[i++].trim());
    out.push({ t: "p", c: parseInline(para.join(" ")) });
  }
  return out;
}

// ───────── sortie React ─────────

const inl = (nodes: Inline[]): ReactNode[] =>
  nodes.map((n, k) => {
    switch (n.t) {
      case "text": return n.v;
      case "b": return <strong key={k}>{inl(n.c)}</strong>;
      case "i": return <em key={k}>{inl(n.c)}</em>;
      case "code": return <code key={k}>{inl(n.c)}</code>;
      case "a": return <a key={k} href={n.href} target="_blank" rel="noreferrer noopener">{inl(n.c)}</a>;
    }
  });

function blk(b: Block, k: number): ReactNode {
  switch (b.t) {
    case "h": {
      const H = (`h${Math.min(6, b.level + 1)}`) as "h2"; // # → h2 : le h1 de la page reste unique
      return <H key={k}>{inl(b.c)}</H>;
    }
    case "p": return <p key={k}>{inl(b.c)}</p>;
    case "ul":
    case "ol": {
      const L = b.t;
      return (
        <L key={k}>
          {b.items.map((it, j) => (
            <li key={j}>{inl(it.c)}{it.kids.map(blk)}</li>
          ))}
        </L>
      );
    }
    case "quote": return <blockquote key={k}>{b.c.map(blk)}</blockquote>;
    case "code": return <pre key={k}><code>{b.v}</code></pre>;
    case "hr": return <hr key={k} />;
    case "table":
      return (
        <div className="mdTable" key={k}>
          <table>
            <thead><tr>{b.head.map((c, j) => <th key={j}>{inl(c)}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, m) => <td key={m}>{inl(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
  }
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  return <div className={className ? `md ${className}` : "md"}>{parseMarkdown(source).map(blk)}</div>;
}

// ───────── sortie HTML (collage avec mise en forme) ─────────

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const inlHtml = (nodes: Inline[]): string =>
  nodes.map((n) => {
    switch (n.t) {
      case "text": return esc(n.v);
      case "b": return `<strong>${inlHtml(n.c)}</strong>`;
      case "i": return `<em>${inlHtml(n.c)}</em>`;
      case "code": return `<code>${inlHtml(n.c)}</code>`;
      case "a": return `<a href="${esc(n.href)}">${inlHtml(n.c)}</a>`;
    }
  }).join("");

function blkHtml(b: Block): string {
  switch (b.t) {
    case "h": return `<h${Math.min(6, b.level + 1)}>${inlHtml(b.c)}</h${Math.min(6, b.level + 1)}>`;
    case "p": return `<p>${inlHtml(b.c)}</p>`;
    case "ul":
    case "ol": return `<${b.t}>${b.items.map((it) => `<li>${inlHtml(it.c)}${it.kids.map(blkHtml).join("")}</li>`).join("")}</${b.t}>`;
    case "quote": return `<blockquote>${b.c.map(blkHtml).join("")}</blockquote>`;
    case "code": return `<pre><code>${esc(b.v)}</code></pre>`;
    case "hr": return "<hr>";
    case "table":
      return `<table><thead><tr>${b.head.map((c) => `<th>${inlHtml(c)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inlHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
}

export const mdToHtml = (md: string) => parseMarkdown(md).map(blkHtml).join("\n");

// ───────── sortie texte brut ─────────

const inlPlain = (nodes: Inline[]): string =>
  nodes.map((n) => (n.t === "text" ? n.v : n.t === "a" ? `${inlPlain(n.c)} (${n.href})` : inlPlain(n.c))).join("");

function blkPlain(b: Block, depth = 0): string {
  const pad = "  ".repeat(depth);
  switch (b.t) {
    case "h": return `${b.level <= 2 ? inlPlain(b.c).toUpperCase() : inlPlain(b.c)}`;
    case "p": return inlPlain(b.c);
    case "ul":
    case "ol":
      return b.items.map((it, j) => `${pad}${b.t === "ol" ? `${j + 1}.` : "-"} ${inlPlain(it.c)}${it.kids.map((k) => "\n" + blkPlain(k, depth + 1)).join("")}`).join("\n");
    case "quote": return b.c.map((k) => blkPlain(k)).join("\n\n").split("\n").map((l) => `> ${l}`).join("\n");
    case "code": return b.v;
    case "hr": return "—";
    case "table": return [b.head, ...b.rows].map((r) => r.map(inlPlain).join(" | ")).join("\n");
  }
}

export const mdToPlain = (md: string) => parseMarkdown(md).map((b) => blkPlain(b)).join("\n\n").trim();
