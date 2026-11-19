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

## Activation (une fois par navigateur)

1. **Jeton GitHub** : GitHub → Settings → Developer settings → Fine-grained tokens → *Generate*. Repository access :
   *Only select repositories* → ton portfolio. Permissions : **Contents : Read and write**. Expiration : 90 jours.
2. Ouvre `/admin/` : dépôt (`proprietaire/nom`), branche, jeton, et une **phrase secrète** (8 caractères minimum, à toi seul).
   Jeton et clés sont chiffrés avec elle (AES-GCM, clé dérivée par PBKDF2) avant d'être gardés dans ce navigateur.
3. Dans « Fournisseurs d'IA », coche ceux que tu veux, colle leurs clés, « Enregistrer les clés », « Tester ».
4. À chaque nouvelle ouverture du site (onglet fermé ou page rechargée), le coffre est **verrouillé** : saisis ta phrase secrète
   (invite sur `/admin/` ou en haut de `/cv/`). Les liens internes du site gardent la session ouverte ; un rechargement la ferme.
   Phrase oubliée : « Effacer ce navigateur », puis recrée jeton et clés (rien n'est perdu côté site).

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

## Assistant IA multi-fournisseurs (dans `/cv/`)

Fournisseurs pris en charge : Google Gemini, Groq, OpenRouter, Mistral, Anthropic (Claude), OpenAI (API). Tu peux en activer plusieurs.

- **Automatique** : l'ordre de `/admin/` est suivi (gratuits d'abord par défaut). Quand un fournisseur répond « quota/limite/crédit épuisé »
  (ou refuse la clé, ou tombe), il est **mis en pause** (durée du `Retry-After` si fourni, sinon 5 min ; 6 h si crédit épuisé ; 24 h si clé refusée)
  et le suivant est essayé. Il est réessayé tout seul après la pause ; « Réinitialiser les pauses » force.
- **Manuel** : tu choisis un fournisseur (liste dans `/cv/` ou `/admin/`) ; il est utilisé jusqu'à sa limite, avec un message clair, puis tu en choisis un autre.
- Les **images** (capture d'offre) ne partent que vers les fournisseurs qui les lisent (Gemini, Claude, OpenAI).
- **Que dois-je améliorer ?** s'affiche mis en forme (titres, listes, tableaux) avec **Copier** (collage avec mise en forme dans Word, Docs, Notion) et **Copier en Markdown**.
- La **lettre de motivation** (`/cv/letter/`) utilise aussi ce mécanisme.
- **Reformuler pour cette offre** et **Que dois-je améliorer ?** utilisent ce mécanisme. Le garde-fou signale tout outil absent de ton profil,
  tout chiffre nouveau et tout « À COMPLÉTER » ; il vaut pour tous les fournisseurs. Le dernier fournisseur utilisé et les pauses sont affichés.

À savoir : les noms de modèles et les quotas gratuits changent souvent (corrige les modèles dans `/admin/`, vérifie les quotas chez chaque fournisseur) ;
un **abonnement ChatGPT n'est pas une clé API** et ne donne pas de crédits API ; certains niveaux gratuits peuvent utiliser les données envoyées pour
améliorer leurs modèles, donc n'y envoie que ce que tu acceptes (ton CV et des offres publiques).

## Sécurité, en bref

- **Rien de secret dans le site publié** : ni dans le HTML, ni dans le JavaScript, ni dans le dépôt (vérifié par un scan du site généré). Les appels IA
  partent de ton navigateur vers le fournisseur, avec la clé déchiffrée en mémoire seulement.
- Sur disque, jeton et clés n'existent que **chiffrés**. Sans ta phrase secrète, le contenu du navigateur ne les révèle pas.
- Ce que cela **ne** protège **pas** : un navigateur compromis (extension malveillante, malware) pendant que le coffre est déverrouillé. Garde peu
  d'extensions, ne déverrouille que sur tes appareils, et verrouille ou ferme l'onglet après usage.
- Réduis les dégâts possibles : jeton limité à ce dépôt et expirant, clés dédiées à cet usage avec plafond de dépense quand le fournisseur le permet.
  Si un doute apparaît, **révoque** la clé ou le jeton chez le fournisseur : c'est immédiat.
- Offres enregistrées, radar et conseils restent dans ce navigateur (en clair, ce ne sont pas des secrets).
