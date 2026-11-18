// Fournisseurs d'IA pris en charge. Les noms de modèles évoluent : tout est modifiable dans /admin/.
export type ProviderId = "google" | "groq" | "openrouter" | "mistral" | "anthropic" | "openai";

export type ProviderMeta = { id: ProviderId; label: string; defaultModel: string; vision: boolean; keyUrl: string; note: string };

// Ordre par défaut : les offres gratuites d'abord, les payantes en dernier recours.
export const PROVIDERS: ProviderMeta[] = [
  { id: "google", label: "Google Gemini", defaultModel: "gemini-2.5-flash", vision: true, keyUrl: "https://aistudio.google.com/apikey", note: "Offre gratuite avec quotas (Google AI Studio)." },
  { id: "groq", label: "Groq", defaultModel: "llama-3.3-70b-versatile", vision: false, keyUrl: "https://console.groq.com/keys", note: "Offre gratuite avec quotas." },
  { id: "openrouter", label: "OpenRouter", defaultModel: "meta-llama/llama-3.3-70b-instruct:free", vision: false, keyUrl: "https://openrouter.ai/keys", note: "Modèles « :free » avec quotas." },
  { id: "mistral", label: "Mistral", defaultModel: "mistral-small-latest", vision: false, keyUrl: "https://console.mistral.ai/api-keys", note: "Niveau gratuit d'expérimentation." },
  { id: "anthropic", label: "Anthropic (Claude)", defaultModel: "claude-sonnet-5-5", vision: true, keyUrl: "https://console.anthropic.com/settings/keys", note: "Payant (crédits API)." },
  { id: "openai", label: "OpenAI (API)", defaultModel: "gpt-4o-mini", vision: true, keyUrl: "https://platform.openai.com/api-keys", note: "Payant : un abonnement ChatGPT ne donne pas de crédits API." },
];

export const META = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<ProviderId, ProviderMeta>;
