export type Lang = "fr" | "en";

export type Entry = {
  id: string;
  title: string;
  /** Intitulé exact du poste / du cursus (important pour les ATS). */
  role?: string;
  /** Contexte court (ex. nom du module scolaire). */
  context?: string;
  place?: string;
  period?: string;
  /** Texte du portfolio, à la première personne. */
  body: string;
  /** Puces du CV : sans pronom, verbe d'action en tête, une idée par puce. */
  bullets: string[];
  /** Étiquettes affichées ET utilisées pour le matching avec les offres. */
  skills: string[];
  links?: { label: string; href: string }[];
};

export type Profile = {
  name: string;
  tagline: string;
  /** Titre du CV, repris tel quel sous le nom. */
  headline: string;
  availability: string;
  nav: Record<"profile" | "experience" | "education" | "projects" | "extra" | "contact", string>;
  labels: Record<
    "contact" | "skills" | "languages" | "qualities" | "interests" | "skillsUsed" | "viewOnGithub" | "moreRepos" | "cvTool",
    string
  >;
  profile: { heading: string; body: string; cvSummary: string };
  skillGroups: { label: string; items: string[] }[];
  /** Compétences réellement en cours d'apprentissage (affichées sur le CV seulement si l'offre les demande). */
  learning: string[];
  languages: { lang: string; level: string }[];
  qualities: string[];
  interests: string[];
  experience: { heading: string; items: Entry[] };
  education: { heading: string; items: Entry[] };
  projects: { heading: string; items: Entry[] };
  extra: { heading: string; items: Entry[] };
  freelance: {
    heading: string;
    intro: string;
    services: { title: string; body: string }[];
    cta: string;
  };
  footer: { heading: string; body: string };
};

export const contact = {
  phone: "+212 656 799 765",
  email: "rayaneyj0303@gmail.com",
  schoolEmail: "rayane.yajjou@centrale-casablanca.ma",
  location: "Kénitra, Morocco",
  linkedin: "https://www.linkedin.com/in/rayane-yajjou-b02a9a285/",
  linkedinLabel: "in/rayane-yajjou",
  github: "https://github.com/rayaneYAJJOU",
  githubLabel: "rayaneYAJJOU",
};

// Le contenu (FR + EN) vit dans data/profile.json : c'est ce fichier que l'éditeur /admin/ modifie
// et publie. Les types ci-dessus décrivent sa structure.
import data from "../data/profile.json";

export const content = data as unknown as Record<Lang, Profile>;
