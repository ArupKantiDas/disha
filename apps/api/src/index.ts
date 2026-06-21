import express from "express";
import cors from "cors";

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Phase 0 — proves the two ends can talk. Real endpoints land in later phases.
app.get("/health", (_req, res) => {
  res.json({
    service: "disha-api",
    status: "ok",
    message: "Disha API is alive. Gemini interprets, the engine computes.",
  });
});

app.listen(PORT, () => {
  console.log(`[disha-api] listening on http://localhost:${PORT}`);
});
