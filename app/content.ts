export type Lang = "fr" | "en";

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

export const content = {
  fr: {
    name: "Rayane Yajjou",
    tagline: "Élève ingénieur à la recherche d'un stage de fin d'études (PFE)",
    nav: {
      profile: "Profil",
      experience: "Expérience",
      education: "Éducation",
      projects: "Projets",
      extra: "Activités",
      contact: "Contact",
    },
    labels: {
      contact: "Contact",
      skills: "Compétences",
      languages: "Langues",
      qualities: "Qualités",
      interests: "Intérêts",
      skillsUsed: "Compétences",
      viewOnGithub: "Voir sur GitHub",
      moreRepos: "Autres dépôts",
    },
    profile: {
      heading: "Profil",
      body: "Je m'appelle Rayane Yajjou, j'ai 22 ans et je suis actuellement étudiant en ingénierie à l'École Centrale Casablanca. Avant cela, j'ai suivi deux années de classes préparatoires (CPGE) au Lycée Moulay Youssef. Mon parcours académique est enrichi par ma passion pour des sujets variés, avec un intérêt particulier pour les mathématiques, l'informatique et la physique.",
    },
    skills: [
      "Programmation (C, Python, Lua)",
      "Développement web",
      "Développmeent logiciel",
      "Développement jeux-vidéo",
      "Machine Learning & AI",
      "Science des données"
    ],
    languages: [
      { lang: "Français", level: "Compétences professionnelles" },
      { lang: "Anglais", level: "Bilingue" },
      { lang: "Arabe", level: "Langue natale" },
    ],
    qualities: ["Créativité", "Esprit analytique", "Pensée critique", "Autonomie", "Polyvalence"],
    interests: ["Mathématiques", "Physique"],
    experience: {
      heading: "Expérience",
      items: [
        {
          title: "Amendis Tétouan",
          period: "Avril 2025 – Août 2025",
          body: "J'ai d'abord travaillé sur la manipulation et la gestion de fichiers .prn relatifs aux relevés techniques du réseau. Par la suite, j'ai analysé et croisé des données issues des systèmes SCADA et GMAO (VAMS) afin de développer des indicateurs de performance (KPIs) destinés à optimiser la maintenance préventive et à améliorer l'efficacité des stations de pompage.",
          skills: ["Python", "Développement logiciel", "Système de contrôle et d'acquisition des données (SCADA)"],
        },
        {
          title: "3D SMART Factory",
          period: "Août 2024 – Septembre 2024",
          body: "J'ai développé des algorithmes de segmentation sémantique appliqués aux images médicales 3D et analysé des données médicales afin d'améliorer la précision de la segmentation des structures anatomiques.",
          skills: ["Machine Learning", "Deep Learning", "Vision par ordinateur", "Python"],
        },
      ],
    },
    education: {
      heading: "Éducation",
      items: [
        {
          title: "École Centrale Casablanca",
          period: "2023 – 2027",
          body: "Trois années du cycle ingénieur centralien.",
          skills: ["Mathématiques", "Physique", "Machine Learning", "Deep Learning", "Développement web", "Développement logiciel", "Programmation orientée objet", "Réseaux Télécoms", "Cybersécurité", "Python", "R"],
        },
        {
          title: "CPGE Lycée Moulay Youssef",
          period: "2021 – 2023",
          body: "Deux années de classes préparatoires aux concours d'entrée aux Grandes Écoles d'Ingénieur en France et au Maroc.",
          skills: ["Mathématiques", "Physique", "Python", "SQL"],
        },
      ],
    },
    projects: {
      heading: "Projets",
      items: [
        {
          title: "Projet Innovation",
          body: "J'ai conçu une application qui met en avant les risques associés aux actifs dans un portefeuille en optimisant sa composition.",
          skills: ["Mathématiques", "Finance", "Python"],
        },
        {
          title: "Projet Scientifique",
          body: "J'ai créé un modèle de machine learning dans le contexte de la maintenance prédictive, en utilisant la théorie du transport optimal pour trouver un seuil qui détermine l'état d'une machine.",
          skills: ["Mathématiques", "Python", "Transport optimal"],
        },
        {
          title: "Projet Learning by Doing",
          body: "J'ai développé un modèle d'apprentissage automatique visant à évaluer le niveau de compétence des étudiants, ainsi qu'un site web servant d'interface graphique pour les différents cas d'utilisation.",
          skills: ["Machine Learning", "Python", "JavaScript", "TypeScript", "React", "Développement web"],
        },
        {
          title: "Projet Formation Expérimentale",
          body: "J'ai mesuré la valeur de la permittivité électrique en utilisant des circuits classiques (RC, RLC, ponts de type Wheatstone, etc.).",
          skills: ["Mathématiques", "Physique"],
        },
        {
          title: "Coding Week",
          body: "J'ai participé à un événement au cours duquel j'ai développé un modèle d'apprentissage automatique (arbre de décision) pour détecter les cas de fraude dans les transactions bancaires. Cet exercice m'a permis d'acquérir une compréhension pratique des concepts fondamentaux de l'apprentissage automatique.",
          skills: ["Machine Learning", "Python"],
        },
        {
          title: "Projet à enjeux",
          body: "J'ai conçu un simulateur d'évacuation réaliste intégrant des comportements d'agents avancés et des contraintes environnementales afin d'améliorer la résilience des infrastructures. Grâce à l'intelligence artificielle et au Machine Learning, j'ai optimisé les itinéraires en temps réel et créé un outil prédictif des temps d'évacuation, permettant ainsi de réduire la congestion aux sorties.",
          skills: ["Machine Learning", "Modélisation multi-agent", "Python"]
        }
      ],
    },
    extra: {
      heading: "Activités extra-scolaires",
      items: [
        {
          title: "Competitive programming",
          body: "J'ai participé à plusieurs concours nationaux de programmation, notamment ITHOLIC (2022, 2024), JNJD, Game of Code, IT CODE et MNPC.",
          skills: ["Python"],
        },
      ],
    },
    freelance: {
      heading: "Freelance",
      intro: "En parallèle des stages, je suis disponible pour des missions freelance ponctuelles.",
      services: [
        {
          title: "Développement web",
          body: "Sites vitrines, applications web sur mesure, tableaux de bord...",
        },
        {
          title: "Machine Learning & données",
          body: "Modèles prédictifs, analyse de données, automatisation d'indicateurs...",
        },
      ],
      cta: "Discuter d'un projet",
    },
    footer: {
      heading: "Contact",
      body: "Ouvert aux opportunités de stage de fin d'études (PFE). N'hésitez pas à me contacter.",
    },
  },
  en: {
    name: "Rayane Yajjou",
    tagline: "Engineering student looking for a final-year internship (PFE)",
    nav: {
      profile: "Profile",
      experience: "Experience",
      education: "Education",
      projects: "Projects",
      extra: "Activities",
      contact: "Contact",
    },
    labels: {
      contact: "Contact",
      skills: "Skills",
      languages: "Languages",
      qualities: "Qualities",
      interests: "Interests",
      skillsUsed: "Skills",
      viewOnGithub: "View on GitHub",
      moreRepos: "More repositories",
    },
    profile: {
      heading: "Profile",
      body: "My name is Rayane Yajjou, I'm 22 years old, and I'm currently studying engineering at École Centrale Casablanca. Before that, I spent two years in preparatory classes (CPGE) at Lycée Moulay Youssef. My academic path is shaped by a broad curiosity, with a particular interest in mathematics, computer science, and physics.",
    },
    skills: [
      "Programming (C, Python, Lua)",
      "Web development",
      "Software development",
      "Video game development",
      "Machine Learning & AI",
      "Data Science"
    ],
    languages: [
      { lang: "French", level: "Professional working proficiency" },
      { lang: "English", level: "Bilingual" },
      { lang: "Arabic", level: "Native" },
    ],
    qualities: ["Creativity", "Analytical mindset", "Critical thinking", "Autonomy", "Versatility"],
    interests: ["Mathematics", "Physics"],
    experience: {
      heading: "Experience",
      items: [
        {
          title: "Amendis Tétouan",
          period: "Apr 2025 – Aug 2025",
          body: "I started by handling and processing .prn files containing technical network readings. I then analyzed and cross-referenced data from the SCADA and CMMS (VAMS) systems to build performance indicators (KPIs) aimed at optimizing preventive maintenance and improving pumping station efficiency.",
          skills: ["Python", "Software development"],
        },
        {
          title: "3D SMART Factory",
          period: "Aug 2024 – Sep 2024",
          body: "I developed semantic segmentation algorithms for 3D medical imaging and analyzed medical data to improve the accuracy of anatomical structure segmentation.",
          skills: ["Machine Learning", "Deep Learning", "Computer Vision", "Python"],
        },
      ],
    },
    education: {
      heading: "Education",
      items: [
        {
          title: "École Centrale Casablanca",
          period: "2023 – 2027",
          body: "Three years of the Centralien engineering program.",
          skills: ["Mathematics", "Physics", "Machine Learning", "Deep Learning", "Web Development", "Software Development", "OOP", "Networking", "Cybersecurity", "Python", "R"],
        },
        {
          title: "CPGE Lycée Moulay Youssef",
          period: "2021 – 2023",
          body: "Two years of preparatory classes for entrance exams to Grandes Écoles d'Ingénieurs in France and Morocco.",
          skills: ["Mathematics", "Physics", "Python", "SQL"],
        },
      ],
    },
    projects: {
      heading: "Projects",
      items: [
        {
          title: "Innovation Project",
          body: "I designed an application that surfaces the risks associated with assets in a portfolio while optimizing its composition.",
          skills: ["Mathematics", "Finance", "Python"],
        },
        {
          title: "Scientific Project",
          body: "I built a machine learning model for predictive maintenance, using optimal transport theory to find a threshold that determines a machine's health state.",
          skills: ["Mathematics", "Python", "Optimal Transport"],
        },
        {
          title: "Learning by Doing Project",
          body: "I developed a machine learning model to assess students' skill level, along with a website serving as the graphical interface for the different use cases.",
          skills: ["Machine Learning", "Python", "JavaScript", "TypeScript", "React", "Web Development"],
        },
        {
          title: "Experimental Training Project",
          body: "I measured electric permittivity using classic circuits (RC, RLC, Wheatstone-type bridges, etc.).",
          skills: ["Mathematics", "Physics"],
        },
        {
          title: "Coding Week",
          body: "I took part in an event where I built a machine learning model (decision tree) to detect fraud in banking transactions — a hands-on introduction to core machine learning concepts.",
          skills: ["Machine Learning", "Python"],
        },
        {
          title: "Real-World Challenge Project",
          body: "I built a physically realistic evacuation simulator integrating advanced agent behaviors and environmental constraints to enhance infrastructure resilience. Using AI and Machine Learning, I optimized routes in real time and created a predictive tool for evacuation times, effectively reducing exit congestion.",
          skills: ["Machine Learning", "Agent Based Modeling", "Python"]
        }
      ],
    },
    extra: {
      heading: "Extracurricular activities",
      items: [
        {
          title: "Competitive programming",
          body: "I've taken part in several national programming contests, including ITHOLIC (2022, 2024), JNJD, Game of Code, IT CODE, and MNPC.",
          skills: ["Python"],
        },
      ],
    },
    freelance: {
      heading: "Freelance",
      intro: "Alongside internships, I'm available for select freelance work.",
      services: [
        {
          title: "Web development",
          body: "Landing pages, custom web apps, dashboards...",
        },
        {
          title: "Machine learning & data",
          body: "Predictive models, data analysis, KPI automation...",
        },
      ],
      cta: "Discuss a project",
    },
    footer: {
      heading: "Contact",
      body: "Open to final-year internship (PFE) opportunities, feel free to reach out.",
    },
  },
} satisfies Record<Lang, unknown>;
