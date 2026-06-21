import dotenv from "dotenv";

dotenv.config();

export const PORT = Number(process.env.PORT) || 8080;

const DEFAULT_ALLOWED_ORIGINS = [
  "https://web-three-lilac-10.vercel.app",
  "http://localhost:3000",
];

export const ALLOWED_ORIGINS: string[] = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : DEFAULT_ALLOWED_ORIGINS;
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/**
 * Which Gemini backend to use:
 * - "vertex" -> Vertex AI on Google Cloud, authed via ADC (gcloud). No key.
 * - "aistudio" -> Gemini Developer API with an AIza key.
 * Default is vertex: it sidesteps the AQ.-restricted-key problem and keeps
 * everything inside the Google Cloud project.
 */
export const GEMINI_BACKEND = (process.env.GEMINI_BACKEND || "vertex").toLowerCase();
export const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || "";
export const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "global";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export function isGeminiConfigured(): boolean {
  return GEMINI_BACKEND === "vertex"
    ? GOOGLE_CLOUD_PROJECT.length > 0
    : GEMINI_API_KEY.length > 0;
}

/** Options object for the GoogleGenAI constructor, or throws a clear error. */
export function geminiClientOptions():
  | { vertexai: true; project: string; location: string }
  | { apiKey: string } {
  if (GEMINI_BACKEND === "vertex") {
    if (!GOOGLE_CLOUD_PROJECT) {
      throw new Error(
        "GOOGLE_CLOUD_PROJECT is not set for the Vertex backend. Set it in apps/api/.env (and ensure `gcloud auth application-default login` is done).",
      );
    }
    return {
      vertexai: true,
      project: GOOGLE_CLOUD_PROJECT,
      location: GOOGLE_CLOUD_LOCATION,
    };
  }
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set for the aistudio backend. Add an AIza key to apps/api/.env, or use GEMINI_BACKEND=vertex.",
    );
  }
  return { apiKey: GEMINI_API_KEY };
}
