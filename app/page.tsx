"use client";

import { useState } from "react";
import { content, contact, type Lang } from "./content";

function Entry({
  title,
  period,
  body,
  skills,
  skillsLabel,
  delay,
}: {
  title: string;
  period?: string;
  body: string;
  skills: string[];
  skillsLabel: string;
  delay: number;
}) {
  return (
    <div className="entry reveal" style={{ animationDelay: `${delay}ms` }}>
      <div className="entryHead">
        <h3>{title}</h3>
        {period ? <span className="period">{period}</span> : null}
      </div>
      <p className="entryBody">{body}</p>
      <div className="chipRow" aria-label={skillsLabel}>
        {skills.map((s) => (
          <span className="chip" key={s}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const t = content[lang];

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
          <ul className="plainList">
            {t.skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
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
        <section className="section">
          <h2 className="reveal">{t.profile.heading}</h2>
          <p className="profileText reveal">{t.profile.body}</p>
        </section>

        <section className="section">
          <h2>{t.experience.heading}</h2>
          {t.experience.items.map((item, i) => (
            <Entry key={item.title} {...item} skillsLabel={t.labels.skillsUsed} delay={i * 40} />
          ))}
        </section>

        <section className="section">
          <h2>{t.education.heading}</h2>
          {t.education.items.map((item, i) => (
            <Entry key={item.title} {...item} skillsLabel={t.labels.skillsUsed} delay={i * 40} />
          ))}
        </section>

        <section className="section">
          <h2>{t.projects.heading}</h2>
          {t.projects.items.map((item, i) => (
            <Entry key={item.title} {...item} skillsLabel={t.labels.skillsUsed} delay={i * 30} />
          ))}
          <p className="repoNote">
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
          </p>
        </section>

        <section className="section">
          <h2>{t.extra.heading}</h2>
          {t.extra.items.map((item, i) => (
            <Entry key={item.title} {...item} skillsLabel={t.labels.skillsUsed} delay={i * 30} />
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

        <section className="footer">
          <h2>{t.footer.heading}</h2>
          <p>{t.footer.body}</p>
          <div className="ctaRow">
            <a className="cta" href={`mailto:${contact.email}`}>
              {contact.email}
            </a>
            <a className="cta ghost" href={contact.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a className="cta ghost" href={contact.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
          <p className="finePrint">Kénitra, Morocco — {new Date().getFullYear()}</p>
        </section>
      </main>
    </div>
  );
}
