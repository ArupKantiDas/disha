import { GoogleGenAI } from "@google/genai";
import { requireGeminiKey } from "../config.js";

let client: GoogleGenAI | null = null;

/** Lazily-constructed Gemini client so the server boots without a key. */
export function genai(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: requireGeminiKey() });
  }
  return client;
}
