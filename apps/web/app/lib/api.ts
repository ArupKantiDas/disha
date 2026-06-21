import type { CompareResponse, FactorRow, LedgerState } from "./types";

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

async function handleError(res: Response): Promise<never> {
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (typeof body?.error === "string") message = body.error;
  } catch {
    // ignore JSON parse failure on error body
  }
  throw new Error(message);
}

export async function getLedger(clientId: string): Promise<LedgerState> {
  const res = await fetch(`${API_URL}/ledger/${encodeURIComponent(clientId)}`);
  if (!res.ok) return handleError(res);
  return res.json() as Promise<LedgerState>;
}

export async function commitDecision(payload: {
  clientId: string;
  kgAvoided: number;
  label?: string;
  defaultLabel?: string;
  summary?: string;
  factorKey?: string;
}): Promise<LedgerState> {
  const res = await fetch(`${API_URL}/ledger/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return handleError(res);
  return res.json() as Promise<LedgerState>;
}

export async function getFactors(): Promise<FactorRow[]> {
  const res = await fetch(`${API_URL}/factors`);
  if (!res.ok) return handleError(res);
  const body = await res.json();
  return body.factors as FactorRow[];
}

export async function compareImage(file: File): Promise<CompareResponse> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  // Strip "data:<mime>;base64," prefix
  const base64 = dataUrl.split(",")[1];

  const res = await fetch(`${API_URL}/compare-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
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
