# Mode propriétaire : éditer, publier, assistant IA

## Qui peut quoi

| | Visiteur | Toi (connecté) |
| --- | --- | --- |
| Portfolio FR/EN | oui | oui, avec ton brouillon |
| CV prêt à exporter (`/cv/?view`) | oui (PDF/DOCX) | oui |
| Outil d'adaptation, rapport, radar, IA | non (le CV s'affiche seulement) | oui (`/cv/`) |
| Éditeur et publication (`/admin/`) | non (écran de connexion) | oui |

Le site est statique : il n'y a pas de comptes. Être « propriétaire » veut dire que **ton navigateur détient un jeton
GitHub**. L'interface cachée aux visiteurs n'est qu'un confort ; la vraie barrière est que, sans ce jeton, personne
ne peut écrire dans ton dépôt, et sans ta clé, personne n'utilise ton IA. Le code des outils est public mais ne contient aucun secret.

## Activation (une fois par appareil)

1. **Jeton GitHub** : GitHub → Settings → Developer settings → Fine-grained tokens → *Generate*. Repository access :
   *Only select repositories* → ton portfolio. Permissions : **Contents : Read and write**. Expiration : 90 jours.
2. **Clé Anthropic** (facultatif) : console Anthropic → nouvelle clé **dédiée**, avec une limite de dépense mensuelle.
3. Ouvre `/admin/`, saisis `proprietaire/nom-du-depot`, la branche (`main`), le jeton, la clé, puis « Vérifier et se connecter ».
   Le modèle par défaut est `claude-sonnet-5-5` : modifiable si ton compte en propose un autre.
4. N'active ce mode que sur tes appareils. « Se déconnecter » efface jeton et clé du navigateur.

## Éditer et publier

- `/admin/` : identité, résumé, compétences, « en cours d'apprentissage », expérience, éducation, projets, activités.
  Ajouter, réordonner ou supprimer une entrée s'applique à FR **et** EN ; les textes se modifient dans la langue choisie.
  « Avancé : JSON complet » permet de tout modifier (freelance, langues…).
- Chaque frappe est un **brouillon local** : tu le vois sur le portfolio et dans l'outil CV, pas les visiteurs.
- **Publier** vérifie la structure puis fait un commit de `data/profile.json` ; GitHub Actions reconstruit le site en 1 à 2 minutes.
  Le brouillon disparaît tout seul une fois identique au site publié. En local, fais `git pull` avant de retravailler.

## Importer une offre de n'importe où

- **Favori** (dans `/admin/`) : glisse « → Mon CV » dans ta barre de favoris. Sur une offre (LinkedIn, site d'entreprise…),
  sélectionne le texte de l'offre et clique : `/cv/` s'ouvre avec l'offre collée et sa source. Fonctionne derrière un compte,
  car le texte est lu dans ton navigateur. Certains sites bloquent les favoris : copie-colle alors le texte.
- **Capture d'écran** : colle une image (Ctrl+V) dans le champ de l'offre ou utilise « Importer une capture » :
  le modèle transcrit le texte (post LinkedIn, message, affiche).

## Assistant IA (dans `/cv/`)

- **Reformuler pour cette offre** : résumé et puces réécrits, appliqués à l'aperçu et aux exports. Un **garde-fou** compare le
  résultat à ton profil et signale tout outil absent, tout chiffre nouveau et tout passage « À COMPLÉTER ». Annulable.
- **Que dois-je améliorer ?** : analyse ton profil et les offres enregistrées (radar) et rend forces, faiblesses par entrée avec la
  question précise à te poser, plan d'apprentissage priorisé, améliorations du portfolio/GitHub, actions de la semaine.
- Les appels partent de ton navigateur vers l'API Anthropic avec ta clé ; ils sont facturés sur ton compte.

## Sécurité, en bref

Jeton et clé sont dans le `localStorage` de ton navigateur : ne les mets jamais dans le dépôt, utilise un jeton limité à ce
dépôt et une clé avec plafond, révoque-les si tu perds un appareil. Les offres enregistrées et le radar restent aussi dans ce navigateur.
