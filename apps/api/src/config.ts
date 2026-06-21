import dotenv from "dotenv";

dotenv.config();

export const PORT = Number(process.env.PORT) || 8080;
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export function hasGeminiKey(): boolean {
  return GEMINI_API_KEY.length > 0;
}

/** Returns the key or throws a clear, actionable error. */
export function requireGeminiKey(): string {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Copy apps/api/.env.example to apps/api/.env and add your key from https://aistudio.google.com/apikey",
    );
  }
  return GEMINI_API_KEY;
}
