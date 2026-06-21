import type { CompareResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function compare(text: string): Promise<CompareResponse> {
  const res = await fetch(`${API_URL}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // ignore JSON parse failure on error body
    }
    throw new Error(message);
  }

  return res.json() as Promise<CompareResponse>;
}
