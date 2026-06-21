import cors from "cors";
import express from "express";
import { factorCatalog } from "@disha/engine";
import { compare } from "./compare.js";
import { PORT, isGeminiConfigured } from "./config.js";
import { parseDecision } from "./gemini/parseDecision.js";

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

// Phase 3 — the core. Text -> parse -> engine -> ranked comparison.
app.post("/compare", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  if (!text.trim()) {
    return res.status(400).json({ error: "Provide a non-empty 'text' field." });
  }
  try {
    const parsed = await parseDecision(text);
    res.json(compare(parsed));
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
