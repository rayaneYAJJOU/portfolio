# Rayane Yajjou — Portfolio

Portfolio bilingue (FR/EN) en Next.js, exporté en site statique et déployé sur GitHub Pages,
avec un **générateur de CV adapté à chaque offre** (`/cv/`).

- Portfolio : `?lang=fr` / `?lang=en` dans l'URL, sinon langue du navigateur.
- CV : `/cv/?view` affiche le CV prêt à exporter (PDF/DOCX) ; `/cv/` est l'outil d'adaptation à une offre.
- Tout le contenu (FR + EN) est dans `app/content.ts`. Mode d'emploi : [`docs/TAILORING.md`](docs/TAILORING.md).

## Développer

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # export statique dans ./out
npm run cv:try     # teste le moteur sur une offre d'exemple
```

## Déployer

Push sur `main` : le workflow `.github/workflows/deploy.yml` construit et publie sur GitHub Pages
(Settings → Pages → Source : GitHub Actions). Facultatif : définir `NEXT_PUBLIC_SITE_URL` pour des aperçus de liens absolus.

## Structure

| Chemin | Rôle |
| --- | --- |
| `app/content.ts` | Source de vérité du profil (portfolio + CV) |
| `app/page.tsx` | Portfolio |
| `app/cv/` | Outil CV (aperçu A4, rapport de correspondance, export) |
| `lib/tailor.ts` | Analyse de l'offre, scoring, sélection des projets/puces |
| `lib/taxonomy.ts` | Compétences reconnues (FR/EN) |
| `lib/docxExport.ts` | Export DOCX compatible ATS |
