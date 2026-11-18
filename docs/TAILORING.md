# Adapter son CV à chaque offre

Tout part d'une seule source de vérité : `data/profile.json` (FR + EN), éditable dans `/admin/`. Le portfolio et le CV en sont deux
vues. L'outil `/cv/` ne fait que **choisir, ordonner et mettre en avant** ce qui s'y trouve déjà.
Il n'ajoute jamais une compétence absente de ton profil (`/admin/`).

## Le rituel pour chaque candidature (≈ 5 min)

1. Ouvre `/cv/` (en local : `npm run dev` puis http://localhost:3000/cv/).
2. Colle le texte complet de l'offre (missions + profil recherché + atouts).
3. Vérifie l'**intitulé du poste** (pré-rempli depuis la 1re ligne) : il est repris dans le titre du CV.
   C'est la ligne que les ATS comparent en premier. Ajoute l'entreprise si tu veux.
4. Lis **Correspondance** :
   - *Couvert* : ce que ton profil a déjà. Ces termes remontent dans le résumé et les compétences.
   - *Écarts* : demandés par l'offre, absents de ton profil. Deux choix honnêtes seulement :
     ajouter l'élément à ton profil (`/admin/`) **si tu l'as réellement fait** (projet, cours, stage), ou l'assumer comme écart.
5. Le nombre de projets est choisi automatiquement pour tenir sur **une page** (tu peux le forcer ; alerte si ça déborde), choisis la langue
   (déduite de l'offre : écris en anglais si l'offre est en anglais), puis **Exporter en PDF** (ou DOCX).
   Le fichier est nommé `Rayane_Yajjou_CV_<entreprise>_<LANGUE>`.
6. Relis le résumé généré. Tu peux le remplacer (« Remplacer le résumé ») par 2-3 phrases factuelles.

Garde une copie de chaque CV envoyé dans un dossier `applications/` (ignoré par git) :
tu sauras exactement ce que tu as envoyé à qui.

## Ce que l'outil règle pour les ATS

- Une seule colonne, aucune table, image, icône ni zone de texte.
- Intitulés de sections standards (Profil, Compétences, Expérience professionnelle, Projets, Formation).
- Police Arial, texte réel (sélectionnable) dans le PDF ; DOCX avec vrais styles de titre et puces natives.
- Dates à droite de chaque entrée, intitulé de poste + entreprise + lieu systématiques.
- Mots-clés de l'offre écrits comme dans l'offre (FR/EN reconnus : « apprentissage automatique » = « machine learning »),
  mais seulement s'ils sont vrais pour toi. Les répétitions ne rapportent presque rien (anti keyword-stuffing).

## Ce qui reste à faire de ton côté (l'outil ne peut pas deviner)

- **Chiffres.** Aucune puce n'a de résultat mesuré. Pour chaque stage/projet, ajoute si tu les connais :
  volume de données, nombre de stations, précision/F1/IoU, gain de temps, taille d'équipe.
  « Réduit la congestion aux sorties » devient « réduit la congestion de X % dans N scénarios ».
- **Intitulés exacts** des stages (aujourd'hui « Stagiaire » / « Intern » : remplace-le par celui de ton attestation).
- **Dates et durée du PFE** dans `availability` (ex. « PFE, 6 mois, à partir de février 2027 »).
- **Cohérence Éducation** : `2023 – 2027` mais « trois années du cycle ingénieur » : vérifie l'année de diplôme.
- **Technologies précises** (pandas, scikit-learn, PyTorch, Git, Docker…) si tu les as utilisées : ce sont elles que
  les offres demandent. Ajoute-les aux `skills` des projets et à `skillGroups`.
- Un lien (`links`) vers le dépôt GitHub de chaque projet : les recruteurs cliquent.

## Étendre le moteur

- Nouvelle techno à reconnaître dans les offres : une ligne dans `lib/taxonomy.ts`
  (`S("dbt", "dbt")`, avec alias FR/EN si besoin).
- Tester sans navigateur : `npx tsx scripts/try-tailor.ts fr_data` (ou `en_swe`).

## Passe optionnelle avec un LLM (Claude)

Le moteur sélectionne ; il ne reformule pas. Pour reformuler une puce ou le résumé à la main :

```
Voici mon profil (JSON/texte de content.ts) et une offre de stage.
Contraintes : n'invente aucune compétence, aucun chiffre, aucun outil. Réécris uniquement le résumé
(3 phrases max) et les puces de [expérience X] avec verbe d'action + contexte + résultat, en reprenant
le vocabulaire exact de l'offre quand il est vrai pour moi. Indique ensuite les exigences de l'offre
que mon profil ne couvre pas.
[profil] [offre]
```

Relis toujours : tu dois pouvoir défendre chaque ligne en entretien.

## Outil ou LLM ? Les deux, dans cet ordre

| | Outil `/cv/` | LLM seul (profil recollé à chaque fois) |
| --- | --- | --- |
| Fidélité au profil | Garantie : ne sort que ce qui est dans ton profil (`/admin/`) | À surveiller : peut gonfler ou inventer |
| Mise en forme ATS | Toujours identique et sûre | Variable, à reformater |
| Compréhension fine de l'offre | Limitée aux mots-clés connus | Bonne (nuances, synonymes, ton) |
| Reformulation des puces | Non | Oui |
| Coût / confidentialité | Gratuit, local | Profil renvoyé à chaque fois |

Marche conseillée : (1) l'outil produit la base et le rapport d'écarts ; (2) si l'offre le mérite, colle
le **texte exporté** (pas tout ton profil) + l'offre dans un LLM avec le prompt ci-dessus ; (3) reporte seulement le
résumé retouché dans « Remplacer le résumé ».

## Aller plus loin : prompt, radar, apprentissage

- **Prompt pour Claude** (bouton dans `/cv/`) : copie un prompt complet (offre + CV généré + écarts + règles
  anti-invention) à coller dans Claude. Il reformule le résumé et les puces, propose des mini-projets pour
  chaque écart et prépare des questions d'entretien. Aucune clé d'API n'est nécessaire.
- **Radar des écarts** : « Enregistrer cette offre » garde les écarts dans ton navigateur ; après quelques
  offres, le radar classe ce qui revient le plus, donc **quoi apprendre en priorité**, avec une idée de mini-projet.
- **En cours d'apprentissage** : une compétence que tu apprends vraiment (et pour laquelle tu as déjà commencé
  un mini-projet) peut être ajoutée à `learning: []` dans ton profil (`/admin/`). Elle n'apparaît sur le CV que si
  l'offre la demande, sous l'intitulé « En cours d'apprentissage », jamais mélangée aux compétences acquises.
