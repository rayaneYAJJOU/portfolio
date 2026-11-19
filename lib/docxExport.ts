import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, HeadingLevel, LevelFormat,
  Paragraph, Tab, TabStopType, TextRun,
} from "docx";
import { contactLines as contactGroups, type CV, type CVEntry } from "./tailor";

// DOCX volontairement simple pour les ATS : une colonne, vrais styles de titre,
// puces natives, police standard, aucune table ni image ni zone de texte.

const FONT = "Arial";
const PAGE_W = 11906; // A4
const PAGE_H = 16838;
const MARGIN = 700;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const BODY = 18; // 9 pt

const run = (text: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({ text, font: FONT, size: o.size ?? BODY, bold: o.bold, italics: o.italics, color: o.color });

function contactLines(cv: CV): Paragraph[] {
  return contactGroups(cv).map((group) => {
    const kids: (TextRun | ExternalHyperlink)[] = [];
    group.forEach((c, i) => {
      if (i) kids.push(run("  |  "));
      kids.push(
        c.href && !c.href.startsWith("tel:")
          ? new ExternalHyperlink({ link: c.href, children: [new TextRun({ text: c.text, font: FONT, size: BODY, style: "Hyperlink" })] })
          : run(c.text),
      );
    });
    return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: kids });
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: text.toUpperCase(), font: FONT })],
  });
}

function entry(e: CVEntry): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      keepNext: true,
      spacing: { before: 80, after: 0 },
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
      children: [
        run(e.heading, { bold: true }),
        ...(e.period ? [new TextRun({ children: [new Tab(), e.period], font: FONT, size: BODY })] : []),
      ],
    }),
  ];
  if (e.subheading) out.push(new Paragraph({ keepNext: true, spacing: { after: 20 }, children: [run(e.subheading, { italics: true })] }));
  for (const b of e.bullets) {
    out.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 10 }, children: [run(b)] }));
  }
  return out;
}

export function buildDocx(cv: CV): Document {
  const section = (title: string, list: CVEntry[]) => (list.length ? [heading(title), ...list.flatMap(entry)] : []);
  const exp = section(cv.labels.experience, cv.experience);
  const edu = section(cv.labels.education, cv.education);

  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun({ text: cv.name, font: FONT })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run(cv.headline, { bold: true, size: 20 })] }),
    ...contactLines(cv),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [run(cv.availability, { italics: true })] }),
    heading(cv.labels.summary),
    new Paragraph({ spacing: { after: 20 }, children: [run(cv.summary)] }),
    heading(cv.labels.skills),
    ...cv.skills.map(
      (g) => new Paragraph({ spacing: { after: 10 }, children: [run(`${g.label} : `, { bold: true }), run(g.items.join(", "))] }),
    ),
    ...(cv.educationFirst ? [...edu, ...exp] : exp),
    ...section(cv.labels.projects, cv.projects),
    ...(cv.educationFirst ? [] : edu),
    ...section(cv.labels.extra, cv.extra),
    heading(cv.labels.languages),
    new Paragraph({ children: [run(cv.languages)] }),
  ];

  return new Document({
    creator: cv.name,
    title: `${cv.name} – CV`,
    styles: {
      default: { document: { run: { font: FONT, size: BODY } } },
      paragraphStyles: [
        {
          id: "Title", name: "Title", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: FONT, size: 34, bold: true },
          paragraph: { spacing: { before: 0, after: 20 }, keepNext: true },
        },
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { font: FONT, size: 20, bold: true },
          paragraph: {
            spacing: { before: 110, after: 40 }, keepNext: true, outlineLevel: 0,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "444444", space: 1 } },
          },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 300, hanging: 220 } } } }],
        },
      ],
    },
    sections: [{ properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } }, children }],
  });
}
