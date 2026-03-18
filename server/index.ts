import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = process.env.PORT || 3003;

  app.use(express.json({ limit: "2mb" }));

  // --- API routes ---

  app.post("/api/generate-plan", async (req, res) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
      return;
    }

    const { topic, startDate, systemPrompt } = req.body;
    if (!topic || !systemPrompt) {
      res.status(400).json({ error: "Missing topic or systemPrompt" });
      return;
    }

    const client = new Anthropic({ apiKey });

    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Create a 7-day content plan about: ${topic}. Starting date: ${startDate}. Return only valid JSON.`,
          },
        ],
      });

      const textBlock = message.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text response from Claude");
      }

      let text = textBlock.text.trim();
      if (text.startsWith("```")) {
        text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      let planData;
      try {
        planData = JSON.parse(text);
      } catch {
        res.status(422).json({ error: "Failed to parse AI response as JSON", raw: textBlock.text });
        return;
      }

      res.json(planData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // --- Static files ---

  const clientDist = path.join(__dirname, "..", "client");
  app.use(express.static(clientDist));

  // SPA fallback
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });

  server.listen(PORT, () => {
    console.log(`Social Agency server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
