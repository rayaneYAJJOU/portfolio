// Taxonomie de compétences FR/EN : sert à (1) lire une offre d'emploi,
// (2) savoir ce que TON profil couvre réellement (via app/content.ts).
// Pour ajouter une techno : une ligne ci-dessous. Les alias sont comparés
// sans accents ni majuscules. Une compétence absente de ton profil n'est
// JAMAIS écrite dans le CV : elle apparaît seulement comme "écart" dans le rapport.

export type SkillDef = { key: string; label: string; aliases: string[] };

const S = (key: string, label: string, ...aliases: string[]): SkillDef => ({ key, label, aliases: [key, ...aliases] });

export const TAXONOMY: SkillDef[] = [
  // Langages
  S("python", "Python"),
  S("c++", "C++", "cpp"),
  S("c#", "C#", "csharp"),
  S("java", "Java"),
  S("javascript", "JavaScript", "js"),
  S("typescript", "TypeScript"),
  S("lua", "Lua"),
  S("sql", "SQL"),
  S("matlab", "MATLAB"),
  S("rust", "Rust"),
  S("golang", "Go"),
  S("php", "PHP"),
  S("bash", "Bash / Shell", "shell scripting", "scripting shell", "scripts shell"),
  S("html/css", "HTML/CSS", "html", "css", "html5", "css3"),
  // ML & données
  S("machine learning", "Machine Learning", "apprentissage automatique", "apprentissage statistique", "ml"),
  S("deep learning", "Deep Learning", "apprentissage profond", "reseaux de neurones", "neural networks", "neural network"),
  S("computer vision", "Computer Vision", "vision par ordinateur", "vision artificielle", "traitement d'images", "image processing"),
  S("nlp", "NLP", "traitement du langage naturel", "natural language processing"),
  S("llm", "LLM", "llms", "large language model", "grands modeles de langage"),
  S("generative ai", "Generative AI", "ia generative", "genai", "gen ai"),
  S("reinforcement learning", "Reinforcement Learning", "apprentissage par renforcement"),
  S("data science", "Data Science", "science des donnees", "data scientist"),
  S("data analysis", "Data Analysis", "analyse de donnees", "data analyst", "data analytics", "analyse des donnees"),
  S("data engineering", "Data Engineering", "ingenierie des donnees", "data engineer", "etl", "data pipeline", "pipeline de donnees"),
  S("statistics", "Statistics", "statistiques", "statistique"),
  S("time series", "Time Series", "series temporelles"),
  S("predictive maintenance", "Predictive Maintenance", "maintenance predictive"),
  S("segmentation", "Segmentation", "segmentation semantique", "semantic segmentation", "image segmentation"),
  S("optimization", "Optimization", "optimisation", "optimiser"),
  S("optimal transport", "Optimal Transport", "transport optimal"),
  S("pytorch", "PyTorch"),
  S("tensorflow", "TensorFlow"),
  S("keras", "Keras"),
  S("scikit-learn", "scikit-learn", "sklearn", "scikit learn"),
  S("pandas", "pandas"),
  S("numpy", "NumPy"),
  S("automl", "AutoML", "auto-ml", "automated machine learning", "anai"),
  S("gui", "GUI", "interface graphique", "interfaces graphiques", "graphical user interface", "desktop application", "application desktop"),
  S("matplotlib", "Matplotlib"),
  S("seaborn", "Seaborn"),
  S("plotly", "Plotly"),
  S("streamlit", "Streamlit"),
  S("scipy", "SciPy"),
  S("pyqt", "PyQt", "pyqt5", "pyqt6"),
  S("pygame", "Pygame"),
  S("pymunk", "Pymunk"),
  S("xgboost", "XGBoost"),
  S("lightgbm", "LightGBM"),
  S("gradient boosting", "Gradient Boosting", "gradient boost", "boosting"),
  S("random forest", "Random Forest", "forets aleatoires", "foret aleatoire"),
  S("shap", "SHAP"),
  S("pca", "PCA", "analyse en composantes principales"),
  S("smote", "SMOTE", "smote-tomek", "desequilibre des classes", "class imbalance"),
  S("huggingface", "Hugging Face", "hugging face", "transformers"),
  S("cnn", "CNN", "reseaux de neurones convolutionnels", "convolutional neural network"),
  S("u-net", "U-Net", "unet", "nvnet"),
  S("medical imaging", "Medical Imaging", "imagerie medicale", "irm", "mri", "nifti", "brats", "dicom"),
  S("jupyter", "Jupyter / Colab", "colab", "google colab", "notebook jupyter"),
  S("portfolio optimization", "Portfolio Optimization", "optimisation de portefeuille", "markowitz", "black-litterman", "frontiere efficiente", "efficient frontier"),
  S("monte carlo", "Monte Carlo", "monte-carlo"),
  S("anomaly detection", "Anomaly Detection", "detection d'anomalies", "detection d'anomalie"),
  S("classification", "Classification", "classifieur", "classifier"),
  S("fraud detection", "Fraud Detection", "detection de fraude"),
  S("opencv", "OpenCV"),
  S("spark", "Spark", "pyspark"),
  S("power bi", "Power BI", "powerbi"),
  S("tableau", "Tableau"),
  S("data visualization", "Data Visualization", "visualisation de donnees", "visualisation", "dataviz"),
  S("kpi", "KPIs", "kpis", "indicateurs de performance", "indicateurs cles", "indicateurs de pilotage"),
  S("modeling", "Modeling", "modelisation", "modeling", "simulation", "simulations"),
  S("agent-based modeling", "Agent-Based Modeling", "multi-agent", "multi agent", "modelisation multi-agent", "agent-based", "agent based modeling", "systemes multi-agents"),
  // Développement
  S("web development", "Web Development", "developpement web", "web development", "web developer", "developpeur web", "site web", "sites web"),
  S("frontend", "Front-end", "front-end", "front end"),
  S("backend", "Back-end", "back-end", "back end"),
  S("full stack", "Full-stack", "fullstack", "full-stack"),
  S("react", "React", "react.js", "reactjs"),
  S("next.js", "Next.js", "nextjs"),
  S("node.js", "Node.js", "nodejs"),
  S("angular", "Angular"),
  S("vue", "Vue.js", "vue.js", "vuejs"),
  S("django", "Django"),
  S("flask", "Flask"),
  S("fastapi", "FastAPI"),
  S("rest api", "API REST", "api rest", "apis rest", "restful"),
  S("software development", "Software Development", "developpement logiciel", "software development", "software engineering", "genie logiciel", "software engineer", "ingenieur logiciel"),
  S("oop", "Object-Oriented Programming", "programmation orientee objet", "poo", "object-oriented", "object oriented", "orientee objet"),
  S("algorithms", "Algorithms", "algorithmique", "algorithms", "algorithmes", "structures de donnees", "data structures"),
  S("video game development", "Video Game Development", "jeux video", "jeux-video", "game development", "game dev", "developpement de jeux", "unity", "unreal"),
  // Outils & infra
  S("git", "Git"),
  S("github", "GitHub", "gitlab"),
  S("ci/cd", "CI/CD", "cicd", "integration continue"),
  S("docker", "Docker"),
  S("kubernetes", "Kubernetes", "k8s"),
  S("linux", "Linux"),
  S("agile", "Agile / Scrum", "scrum", "methodes agiles", "methode agile"),
  S("postgresql", "PostgreSQL", "postgres"),
  S("mysql", "MySQL"),
  S("mongodb", "MongoDB"),
  S("nosql", "NoSQL"),
  S("aws", "AWS"),
  S("azure", "Azure"),
  S("gcp", "GCP", "google cloud"),
  S("cloud", "Cloud"),
  // Industrie
  S("scada", "SCADA"),
  S("cmms", "CMMS", "gmao", "cmms", "maintenance assistee par ordinateur"),
  S("preventive maintenance", "Preventive Maintenance", "maintenance preventive", "preventive maintenance"),
  S("maintenance", "Maintenance"),
  S("iot", "IoT", "internet des objets", "internet of things"),
  S("automation", "Automation", "automatisme", "automate programmable", "plc"),
  S("industry 4.0", "Industry 4.0", "industrie 4.0", "industrie du futur"),
  // Réseaux & sécurité
  S("networking", "Networking & Telecoms", "reseaux telecoms", "reseaux informatiques", "reseaux et telecoms", "networking", "computer networks", "telecom networks", "telecommunications", "telecoms"),
  S("cybersecurity", "Cybersecurity", "cybersecurite", "cybersecurity", "securite informatique", "securite des systemes d'information"),
  // Sciences
  S("mathematics", "Mathematics", "mathematiques", "mathematics", "maths", "math"),
  S("physics", "Physics", "physique", "physics"),
  S("finance", "Finance", "financier", "financial", "quantitative finance", "finance de marche"),
  // Langues
  S("english", "English", "anglais", "english"),
  S("french", "French", "francais", "french"),
  S("arabic", "Arabic", "arabe", "arabic"),
];

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/\u00a0/g, " ")
    .toLowerCase();
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

type Compiled = { key: string; re: RegExp };

const COMPILED: Compiled[] = TAXONOMY.map((d) => {
  const parts = [...new Set(d.aliases.map(normalize))].map((a) => {
    const plural = /[a-z]$/.test(a) && a.length >= 4 && !a.endsWith("s") ? "(?:s)?" : "";
    return esc(a) + plural;
  });
  return { key: d.key, re: new RegExp(`(?<![a-z0-9+#.])(?:${parts.join("|")})(?![a-z0-9+#])`, "g") };
});

// "C" et "R" : trop ambigus en minuscules, on exige la majuscule isolée.
const C_RE = /(?:^|[\s,;:/(\[•\-–])C(?=$|[\s,;:/)\].])/;
const R_RE = /(?:^|[\s,;:/(\[•\-–])R(?=$|[\s,;:/)\].])/;

/** Retourne les compétences trouvées dans un texte, avec leur nombre d'occurrences. */
export function scan(text: string): Map<string, number> {
  const out = new Map<string, number>();
  const norm = normalize(text);
  for (const { key, re } of COMPILED) {
    re.lastIndex = 0;
    const n = norm.match(re)?.length ?? 0;
    if (n) out.set(key, n);
  }
  if (C_RE.test(text)) out.set("c", 1);
  if (R_RE.test(text)) out.set("r", 1);
  return out;
}

/** Texte normalisé dont toutes les compétences connues ont été retirées (pour repérer les autres termes). */
export function stripKnown(text: string): string {
  let norm = normalize(text);
  for (const { re } of COMPILED) { re.lastIndex = 0; norm = norm.replace(re, " "); }
  return norm;
}

const EN_LABELS: Record<string, string> = {
  c: "C",
  r: "R",
  ...Object.fromEntries(TAXONOMY.map((d) => [d.key, d.label])),
};

const FR_LABELS: Record<string, string> = {
  "gui": "Interface graphique",
  "data visualization": "Visualisation de données",
  "medical imaging": "Imagerie médicale",
  "portfolio optimization": "Optimisation de portefeuille",
  "anomaly detection": "Détection d'anomalies",
  "fraud detection": "Détection de fraude",
  "generative ai": "IA générative",
  "data analysis": "Data Analysis",
  "statistics": "Statistiques",
  "time series": "Séries temporelles",
  "predictive maintenance": "Maintenance prédictive",
  "optimization": "Optimisation",
  "optimal transport": "Transport optimal",
  "modeling": "Modélisation",
  "agent-based modeling": "Modélisation multi-agent",
  "web development": "Développement web",
  "software development": "Développement logiciel",
  "oop": "Programmation orientée objet",
  "algorithms": "Algorithmique",
  "video game development": "Développement jeux-vidéo",
  "cmms": "GMAO",
  "preventive maintenance": "Maintenance préventive",
  "automation": "Automatisme",
  "industry 4.0": "Industrie 4.0",
  "networking": "Réseaux & Télécoms",
  "cybersecurity": "Cybersécurité",
  "mathematics": "Mathématiques",
  "physics": "Physique",
  "english": "Anglais",
  "french": "Français",
  "arabic": "Arabe",
};

export function labelFor(key: string, lang: "fr" | "en"): string {
  return (lang === "fr" ? FR_LABELS[key] : undefined) ?? EN_LABELS[key] ?? key;
}
