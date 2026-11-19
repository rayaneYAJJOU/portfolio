# Rayane Yajjou — Portfolio

Portfolio bilingue (FR/EN) en Next.js, exporté en site statique et déployé sur GitHub Pages,
avec un **générateur de CV adapté à chaque offre** (`/cv/`).

- Portfolio : `?lang=fr` / `?lang=en` dans l'URL, sinon langue du navigateur.
- CV : `/cv/?view` affiche le CV prêt à exporter (PDF/DOCX) ; `/cv/` est l'outil d'adaptation à une offre.
- Tout le contenu (FR + EN) est dans `data/profile.json`, modifiable depuis le site en mode propriétaire (`/admin/`).
- Mode d'emploi : [`docs/OWNER.md`](docs/OWNER.md) (accès propriétaire, publication, IA, import d'offres) et [`docs/TAILORING.md`](docs/TAILORING.md) (adapter le CV).

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
| `data/profile.json` | Source de vérité du profil FR/EN (portfolio + CV), éditée via `/admin/` |
| `app/content.ts` | Types du profil et coordonnées |
| `app/admin/` | Éditeur et publication (propriétaire) |
| `app/page.tsx` | Portfolio |
| `app/cv/` | Outil CV (aperçu A4, rapport de correspondance, export) |
| `lib/tailor.ts` | Analyse de l'offre, scoring, sélection des projets/puces |
| `lib/taxonomy.ts` | Compétences reconnues (FR/EN) |
| `lib/docxExport.ts` | Export DOCX compatible ATS |
| `app/cv/letter/`, `lib/letter.ts`, `lib/slop.ts`, `lib/letterDocx.ts` | Lettre de motivation « sans cliché » : prompt, détecteur de formules génériques, export DOCX |
| `lib/markdown.tsx`, `lib/clipboard.ts` | Rendu Markdown des réponses de l'IA et copie (mise en forme ou Markdown) |
| `app/cv/fonts/` | Police du CV embarquée (Liberation Sans, métrique Arial) : PDF identique partout |
| `lib/ai.ts`, `lib/providers.ts`, `lib/guard.ts` | Assistant IA multi-fournisseurs avec bascule, garde-fou anti-invention |
| `lib/vault.ts` | Coffre chiffré (jeton et clés), déverrouillé en mémoire |
| `lib/github.ts`, `lib/owner.ts` | Publication par commit et mode propriétaire |
