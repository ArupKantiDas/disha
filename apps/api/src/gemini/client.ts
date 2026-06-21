import { GoogleGenAI } from "@google/genai";
import { geminiClientOptions } from "../config.js";

let client: GoogleGenAI | null = null;

/**
 * Lazily-constructed Gemini client so the server boots without credentials.
 * Backend (Vertex via ADC, or AI Studio key) is chosen by config.
 */
export function genai(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI(geminiClientOptions());
  }
  return client;
}
