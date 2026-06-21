import cors from "cors";
import express from "express";
import { factorCatalog } from "@disha/engine";
import { compare } from "./compare.js";
import { PORT, isGeminiConfigured } from "./config.js";
import { parseDecision } from "./gemini/parseDecision.js";
import { resolveDynamicFactors } from "./resolveDynamic.js";
import { compareFromScreenshot } from "./screenshotFlow.js";
import { commitDecision, getLedger, getRecentDecisions, getStats } from "./ledger.js";
import { verifyIdToken } from "./firebaseAdmin.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({
    service: "disha-api",
    status: "ok",
    geminiConfigured: isGeminiConfigured(),
    message: "Disha API is alive. Gemini interprets, the engine computes.",
  });
});

// The sourced factor table — powers the "how we calculate" credibility panel.
app.get("/factors", (_req, res) => {
  res.json({ factors: factorCatalog() });
});

// Phase 2 — interpret only. Free text in, structured intent + candidates out.
app.post("/parse", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  if (!text.trim()) {
    return res.status(400).json({ error: "Provide a non-empty 'text' field." });
  }
  try {
    const parsed = await parseDecision(text);
    res.json(parsed);
  } catch (err) {
    handleError(res, err);
  }
});

// Phase 3 — the core. Text -> parse -> dynamic resolution -> engine -> ranked comparison.
app.post("/compare", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  if (!text.trim()) {
    return res.status(400).json({ error: "Provide a non-empty 'text' field." });
  }
  try {
    let parsed = await parseDecision(text);
    parsed = await resolveDynamicFactors(parsed);
    res.json({ ...compare(parsed), source: "text" });
  } catch (err) {
    handleError(res, err);
  }
});

// Phase 4 — Door C. Screenshot in, same ranked comparison out. The read option
// becomes the user's default; the engine supplies the greener alternatives.
app.post("/compare-image", async (req, res) => {
  const imageBase64 =
    typeof req.body?.imageBase64 === "string" ? req.body.imageBase64 : "";
  const mimeType =
    typeof req.body?.mimeType === "string" ? req.body.mimeType : "";
  if (!imageBase64) {
    return res
      .status(400)
      .json({ error: "Provide a base64 'imageBase64' field." });
  }
  if (!/^image\/(png|jpe?g|webp|heic|heif)$/i.test(mimeType)) {
    return res.status(400).json({
      error: "Provide a valid image 'mimeType' (png, jpeg, webp, heic).",
    });
  }
  try {
    res.json(await compareFromScreenshot(imageBase64, mimeType));
  } catch (err) {
    handleError(res, err);
  }
});

// Phase 6 — the carbon-avoided ledger. A device-scoped lifetime total that
// only grows. clientId is an anonymous id the browser keeps in localStorage.
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{8,128}$/;
// Firebase UIDs are alphanumeric, typically 28 chars
const FIREBASE_UID_RE = /^[A-Za-z0-9]{20,128}$/;

app.get("/stats", async (_req, res) => {
  try {
    res.json(await getStats());
  } catch (err) {
    handleError(res, err);
  }
});

app.get("/ledger/:clientId", async (req, res) => {
  const clientId = req.params.clientId;
  if (!CLIENT_ID_RE.test(clientId) && !FIREBASE_UID_RE.test(clientId)) {
    return res.status(400).json({ error: "Invalid clientId." });
  }
  try {
    const [state, recent] = await Promise.all([
      getLedger(clientId),
      getRecentDecisions(clientId),
    ]);
    res.json({ ...state, recent });
  } catch (err) {
    handleError(res, err);
  }
});

app.post("/ledger/commit", async (req, res) => {
  const kgAvoided = Number(req.body?.kgAvoided);
  if (!Number.isFinite(kgAvoided)) {
    return res.status(400).json({ error: "kgAvoided must be a number." });
  }

  let ledgerKey: string;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const decoded = await verifyIdToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired ID token." });
    }
    ledgerKey = decoded.uid;
  } else {
    const clientId =
      typeof req.body?.clientId === "string" ? req.body.clientId : "";
    if (!CLIENT_ID_RE.test(clientId)) {
      return res.status(400).json({ error: "Invalid or missing clientId." });
    }
    ledgerKey = clientId;
  }

  try {
    const state = await commitDecision(ledgerKey, kgAvoided, {
      label: req.body?.label,
      factorKey: req.body?.factorKey,
      summary: req.body?.summary,
      defaultLabel: req.body?.defaultLabel,
    });
    res.json(state);
  } catch (err) {
    handleError(res, err);
  }
});

function handleError(res: express.Response, err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  const status = message.includes("not set") ? 503 : 502;
  console.error("[disha-api] error:", message);
  res.status(status).json({ error: message });
}

app.listen(PORT, () => {
  console.log(`[disha-api] listening on http://localhost:${PORT}`);
  console.log(`[disha-api] gemini configured: ${isGeminiConfigured()}`);
});
