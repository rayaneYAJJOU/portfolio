import { tailor, cleanRole } from "../lib/tailor";
import { cvToText } from "../lib/cvText";
import { SAMPLES } from "../lib/samples";

const which = (process.argv[2] ?? "fr_data") as keyof typeof SAMPLES;
const jd = SAMPLES[which];
const { cv, report } = tailor({ lang: which.startsWith("fr") ? "fr" : "en", jd, targetRole: cleanRole(jd.split("\n")[0]) });
console.log(`coverage=${report.coverage}% lang=${report.detectedLang}`);
console.log("MATCHED :", report.matched.map((t) => `${t.label}(${t.weight.toFixed(1)})`).join(", "));
console.log("MISSING :", report.missing.map((t) => `${t.label}(${t.weight.toFixed(1)})`).join(", "));
console.log("OTHER   :", report.otherTerms.join(", "));
console.log("WARN    :", report.warnings);
console.log("PROJECTS:", cv.projects.map((p) => `${p.heading} [${p.score.toFixed(1)}]`));
console.log("-----\n" + cvToText(cv));
