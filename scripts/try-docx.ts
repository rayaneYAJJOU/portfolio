import { writeFileSync } from "node:fs";
import { Packer } from "docx";
import { tailor, cleanRole } from "../lib/tailor";
import { buildDocx } from "../lib/docxExport";
import { SAMPLES } from "../lib/samples";

const k = (process.argv[2] ?? "fr_data") as keyof typeof SAMPLES;
const jd = SAMPLES[k];
const { cv } = tailor({ lang: k.startsWith("fr") ? "fr" : "en", jd, targetRole: cleanRole(jd.split("\n")[0]), maxProjects: Number(process.argv[3] ?? 3) });
Packer.toBuffer(buildDocx(cv)).then((b) => { writeFileSync(`/tmp/cv_${k}.docx`, b); console.log("ok", b.length); });
