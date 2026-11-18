import type { Metadata } from "next";
import { contact } from "./content";
import "./globals.css";

// Optionnel : définir NEXT_PUBLIC_SITE_URL (ex. https://rayaneyajjou.github.io/portfolio)
// pour que les aperçus de liens (LinkedIn, Slack…) utilisent une URL absolue.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

const description =
  "Rayane Yajjou — engineering student at École Centrale Casablanca, seeking a final-year internship (PFE). Machine learning, data, mathematics, software.";

export const metadata: Metadata = {
  title: "Rayane Yajjou — Portfolio",
  description,
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  openGraph: { title: "Rayane Yajjou — Portfolio", description, type: "profile", locale: "en_US", alternateLocale: ["fr_FR"] },
  twitter: { card: "summary", title: "Rayane Yajjou — Portfolio", description },
};

// Données structurées (aide Google à identifier la personne). Pas d'email ni de téléphone ici.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Rayane Yajjou",
  jobTitle: "Engineering student",
  alumniOf: [{ "@type": "CollegeOrUniversity", name: "École Centrale Casablanca" }],
  knowsAbout: ["Machine Learning", "Deep Learning", "Computer Vision", "Data Science", "Python", "Software Development"],
  address: { "@type": "PostalAddress", addressLocality: "Kénitra", addressCountry: "MA" },
  sameAs: [contact.linkedin, contact.github],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#14161a" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
