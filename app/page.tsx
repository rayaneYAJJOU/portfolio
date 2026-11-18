"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useNavigatorLang, useSearch } from "../lib/clientEnv";
import { content, contact, type Entry as EntryData, type Lang } from "./content";

function Entry({
  title,
  role,
  context,
  place,
  period,
  body,
  skills,
  links,
  skillsLabel,
  delay,
}: EntryData & { skillsLabel: string; delay: number }) {
  const sub = [role, context, place].filter(Boolean).join(" · ");
  return (
    <div className="entry reveal" style={{ animationDelay: `${delay}ms` }}>
      <div className="entryHead">
        <h3>{title}</h3>
        {period ? <span className="period">{period}</span> : null}
      </div>
      {sub ? <p className="entrySub">{sub}</p> : null}
      <p className="entryBody">{body}</p>
      <div className="chipRow" aria-label={skillsLabel}>
        {skills.map((s) => (
          <span className="chip" key={s}>
            {s}
          </span>
        ))}
      </div>
      {links?.length ? (
        <p className="entryLinks">
          {links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </p>
      ) : null}
    </div>
  );
}

export default function Home() {
  // Langue : choix manuel > ?lang=fr|en dans l'URL > langue du navigateur.
  const [choice, setLang] = useState<Lang | null>(null);
  const urlLang = new URLSearchParams(useSearch()).get("lang");
  const navLang = useNavigatorLang();
  const lang: Lang =
    choice ?? (urlLang === "fr" || urlLang === "en" ? urlLang : navLang.toLowerCase().startsWith("fr") ? "fr" : "en");
  const t = content[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="langToggle reveal" role="group" aria-label="Language">
          <button data-active={lang === "en"} onClick={() => setLang("en")}>
            EN
          </button>
          <button data-active={lang === "fr"} onClick={() => setLang("fr")}>
            FR
          </button>
        </div>

        <div className="identity reveal" style={{ animationDelay: "60ms" }}>
          <h1>{t.name}</h1>
          <p>{t.tagline}</p>
        </div>

        <nav className="sideNav reveal" style={{ animationDelay: "90ms" }} aria-label="Sections">
          {(["profile", "experience", "education", "projects", "extra", "contact"] as const).map((k) => (
            <a key={k} href={`#${k}`}>
              {t.nav[k]}
            </a>
          ))}
        </nav>

        <div className="sideBlock reveal" style={{ animationDelay: "120ms" }}>
          <h2>{t.labels.contact}</h2>
          <ul className="contactList">
            <li>
              <span className="k">Email</span>
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </li>
            <li>
              <span className="k">Email (school)</span>
              <a href={`mailto:${contact.schoolEmail}`}>{contact.schoolEmail}</a>
            </li>
            <li>
              <span className="k">Phone</span>
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a>
            </li>
            <li>
              <span className="k">Location</span>
              <span>{contact.location}</span>
            </li>
            <li>
              <span className="k">LinkedIn</span>
              <a href={contact.linkedin} target="_blank" rel="noreferrer">
                {contact.linkedinLabel}
              </a>
            </li>
            <li>
              <span className="k">GitHub</span>
              <a href={contact.github} target="_blank" rel="noreferrer">
                {contact.githubLabel}
              </a>
            </li>
          </ul>
        </div>

        <div className="sideBlock reveal" style={{ animationDelay: "170ms" }}>
          <h2>{t.labels.skills}</h2>
          <div className="skillGroups">
            {t.skillGroups.map((g) => (
              <div key={g.label}>
                <h3>{g.label}</h3>
                <p>{g.items.join(", ")}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="sideBlock reveal" style={{ animationDelay: "210ms" }}>
          <h2>{t.labels.languages}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {t.languages.map((l) => (
              <div className="langLine" key={l.lang}>
                <span>{l.lang}</span>
                <span>{l.level}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sideBlock reveal" style={{ animationDelay: "250ms" }}>
          <h2>{t.labels.qualities}</h2>
          <div className="chipRow">
            {t.qualities.map((q) => (
              <span className="chip" key={q}>
                {q}
              </span>
            ))}
          </div>
        </div>

        <div className="sideBlock reveal" style={{ animationDelay: "290ms" }}>
          <h2>{t.labels.interests}</h2>
          <div className="chipRow">
            {t.interests.map((i) => (
              <span className="chip" key={i}>
                {i}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <main>
        <section className="section" id="profile">
          <h2 className="reveal">{t.profile.heading}</h2>
          <p className="profileText reveal">{t.profile.body}</p>
        </section>

        <section className="section" id="experience">
          <h2>{t.experience.heading}</h2>
          {t.experience.items.map((item, i) => (
            <Entry key={item.id} {...item} skillsLabel={t.labels.skillsUsed} delay={i * 40} />
          ))}
        </section>

        <section className="section" id="education">
          <h2>{t.education.heading}</h2>
          {t.education.items.map((item, i) => (
            <Entry key={item.id} {...item} skillsLabel={t.labels.skillsUsed} delay={i * 40} />
          ))}
        </section>

        <section className="section" id="projects">
          <h2>{t.projects.heading}</h2>
          {t.projects.items.map((item, i) => (
            <Entry key={item.id} {...item} skillsLabel={t.labels.skillsUsed} delay={i * 30} />
          ))}
          {/*<p className="repoNote">
            {t.labels.moreRepos}:{" "}
            <a href="https://github.com/rayaneYAJJOU/2d-game-engine" target="_blank" rel="noreferrer">
              2d-game-engine
            </a>
            ,{" "}
            <a href="https://github.com/rayaneYAJJOU/test-game-engine" target="_blank" rel="noreferrer">
              test-game-engine
            </a>{" "}
            —{" "}
            <a href={contact.github} target="_blank" rel="noreferrer">
              {t.labels.viewOnGithub}
            </a>
          </p>*/}
        </section>

        <section className="section" id="extra">
          <h2>{t.extra.heading}</h2>
          {t.extra.items.map((item, i) => (
            <Entry key={item.id} {...item} skillsLabel={t.labels.skillsUsed} delay={i * 30} />
          ))}
        </section>

        <section className="section">
          <h2>{t.freelance.heading}</h2>
          <p className="profileText" style={{ marginBottom: 20 }}>
            {t.freelance.intro}
          </p>
          <div className="serviceGrid">
            {t.freelance.services.map((s) => (
              <div className="serviceCard" key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
          <div className="ctaRow" style={{ marginTop: 18 }}>
            <a
              className="cta"
              href={`mailto:${contact.email}?subject=${encodeURIComponent(
                lang === "fr" ? "Projet freelance" : "Freelance project"
              )}`}
            >
              {t.freelance.cta}
            </a>
          </div>
        </section>

        <section className="footer" id="contact">
          <h2>{t.footer.heading}</h2>
          <p>{t.footer.body}</p>
          <div className="ctaRow">
            <a className="cta" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
            <Link className="cta ghost" href={`/cv/?view&lang=${lang}`}>
              CV
            </Link>
            <a className="cta ghost" href={contact.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a className="cta ghost" href={contact.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
          <p className="finePrint">Kénitra, Morocco</p>
        </section>
      </main>
    </div>
  );
}
