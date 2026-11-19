import { AlignmentType, Document, ExternalHyperlink, Paragraph, TextRun } from "docx";
import { contact, type Lang } from "../app/content";

// Lettre en DOCX : une colonne, texte réel, police standard. Le bloc expéditeur, la date et le destinataire
// sont ajoutés ici (le modèle n'écrit que l'objet, la salutation, le corps et la signature).

const FONT = "Arial";
const SIZE = 22; // 11 pt

const run = (text: string, bold = false) => new TextRun({ text, font: FONT, size: SIZE, bold });
const para = (children: (TextRun | ExternalHyperlink)[], o: { after?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
  new Paragraph({ alignment: o.align, spacing: { after: o.after ?? 0, line: 276 }, children });

export function buildLetterDocx(text: string, o: { lang: Lang; name: string; company?: string }): Document {
  const fr = o.lang === "fr";
  const place = fr ? "Kénitra" : "Kénitra, Morocco";
  const date = new Date().toLocaleDateString(fr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  const head: Paragraph[] = [
    para([run(o.name, true)]),
    para([run(contact.email)]),
    para([run(contact.phone)]),
    para([run(fr ? "Kénitra, Maroc" : contact.location)], { after: 240 }),
    ...(o.company ? [para([run(o.company, true)], { align: AlignmentType.RIGHT, after: 120 })] : []),
    para([run(fr ? `${place}, le ${date}` : `${place}, ${date}`)], { align: AlignmentType.RIGHT, after: 280 }),
  ];

  const blocks = text.replace(/\r\n?/g, "\n").trim().split(/\n{2,}/);
  const body: Paragraph[] = blocks.map((b, i) => {
    const lines = b.split("\n");
    const isSubject = i === 0 && /^(objet|subject)\s*:/i.test(lines[0]);
    // un bloc court de 2 lignes (formule + signature) garde son saut de ligne
    const kids = lines.flatMap((l, k) => (k ? [new TextRun({ text: l, font: FONT, size: SIZE, bold: isSubject, break: 1 })] : [new TextRun({ text: l, font: FONT, size: SIZE, bold: isSubject })]));
    return para(kids, { after: 160, align: isSubject ? AlignmentType.LEFT : AlignmentType.JUSTIFIED });
  });

  return new Document({
    creator: o.name,
    title: fr ? `Lettre de motivation – ${o.name}` : `Cover letter – ${o.name}`,
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1304, right: 1304 } } }, children: [...head, ...body] }],
  });
}
