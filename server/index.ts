import express from "express";
import { createServer } from "http";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  createUser, getUserByEmail, getUserById,
  getClientsByUser, getClientById, createClient, updateClient, deleteClient,
  getActiveClientId, setActiveClientId,
  getPlansByClient, getPlanById, savePlan, deletePlan,
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SECURITY: Require JWT_SECRET from environment — no hardcoded fallback
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is required");
  process.exit(1);
}
const JWT_SECRET: string = process.env.JWT_SECRET;

// SECURITY: Simple in-memory rate limiter for auth endpoints
const authAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 15; // max attempts per window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = authAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Clean up rate limit map every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of authAttempts) {
    if (now > entry.resetAt) authAttempts.delete(ip);
  }
}, 30 * 60 * 1000);

// SECURITY: Sanitize filenames — strip path traversal and dangerous characters
function sanitizeFilename(name: string): string {
  return name
    .replace(/\.\./g, "")
    .replace(/[/\\]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 255);
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: string; email: string };
    (req as unknown as Record<string, unknown>).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function getUserId(req: express.Request): string {
  return (req as unknown as Record<string, unknown>).userId as string;
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = process.env.PORT || 3003;

  app.use(express.json({ limit: "2mb" }));

  // SECURITY: Security headers
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  // --- S3 setup ---

  const s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
  const S3_BUCKET = process.env.AWS_S3_BUCKET || "social-agency-media";
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

  // ============================================================
  // AUTH ROUTES (public)
  // ============================================================

  app.post("/api/auth/register", async (req, res) => {
    // SECURITY: Rate limit registration
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`register:${ip}`)) {
      res.status(429).json({ error: "Too many attempts. Try again later." });
      return;
    }

    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      res.status(400).json({ error: "Email, name, and password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existing = getUserByEmail(email.toLowerCase().trim());
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user_${crypto.randomUUID()}`;

    createUser(userId, email.toLowerCase().trim(), name.trim(), passwordHash);

    const token = jwt.sign({ userId, email: email.toLowerCase().trim() }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: userId, email: email.toLowerCase().trim(), name: name.trim() } });
  });

  app.post("/api/auth/login", async (req, res) => {
    // SECURITY: Rate limit login attempts
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(`login:${ip}`)) {
      res.status(429).json({ error: "Too many login attempts. Try again later." });
      return;
    }

    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  });

  app.get("/api/auth/me", authMiddleware, (req, res) => {
    const user = getUserById(getUserId(req));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user });
  });

  // ============================================================
  // CLIENT ROUTES (protected)
  // ============================================================

  // List all clients for the authenticated user
  app.get("/api/clients", authMiddleware, (req, res) => {
    const userId = getUserId(req);
    const clients = getClientsByUser(userId);
    const activeId = getActiveClientId(userId);
    res.json({ clients, activeClientId: activeId });
  });

  // Get a single client
  app.get("/api/clients/:id", authMiddleware, (req, res) => {
    const id = req.params.id as string;
    const client = getClientById(id);
    if (!client || client.userId !== getUserId(req)) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json({ client });
  });

  // Create a new client
  app.post("/api/clients", authMiddleware, (req, res) => {
    const userId = getUserId(req);
    const { accountType, business, brand, voice, compliance, platforms, blotatoApiKey } = req.body;

    const clientId = `client_${crypto.randomUUID()}`;
    const client = createClient({
      id: clientId,
      userId,
      accountType: accountType || "individual",
      onboardingComplete: true,
      business: business || {},
      brand: brand || {},
      voice: voice || {},
      compliance: compliance || {},
      platforms: platforms || {},
      blotatoApiKey,
    });

    // Auto-set as active client
    setActiveClientId(userId, clientId);

    res.json({ client });
  });

  // Update a client
  app.put("/api/clients/:id", authMiddleware, (req, res) => {
    const id = req.params.id as string;
    const existing = getClientById(id);
    if (!existing || existing.userId !== getUserId(req)) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const client = updateClient(id, req.body);
    res.json({ client });
  });

  // Delete a client
  app.delete("/api/clients/:id", authMiddleware, (req, res) => {
    const userId = getUserId(req);
    const id = req.params.id as string;
    const existing = getClientById(id);
    if (!existing || existing.userId !== getUserId(req)) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    deleteClient(id, userId);

    // If this was the active client, clear it
    const activeId = getActiveClientId(userId);
    if (activeId === id) {
      const remaining = getClientsByUser(userId);
      if (remaining.length > 0) {
        setActiveClientId(userId, remaining[0].id);
      }
    }

    res.json({ deleted: true });
  });

  // Switch active client
  app.post("/api/clients/active", authMiddleware, (req, res) => {
    const userId = getUserId(req);
    const { clientId } = req.body;

    const client = getClientById(clientId);
    if (!client || client.userId !== userId) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    setActiveClientId(userId, clientId);
    res.json({ activeClientId: clientId });
  });

  // ============================================================
  // PLAN GENERATION (protected)
  // ============================================================

  app.post("/api/generate-plan", authMiddleware, async (req, res) => {
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
        model: "claude-sonnet-4-6",
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

  // ============================================================
  // CONTENT PLAN ROUTES (protected)
  // ============================================================

  // List plans for a client
  app.get("/api/plans", authMiddleware, (req, res) => {
    const userId = getUserId(req);
    const clientId = req.query.clientId as string;
    if (!clientId) {
      res.status(400).json({ error: "clientId query param required" });
      return;
    }

    // SECURITY: Validate client ownership
    const client = getClientById(clientId);
    if (!client || client.userId !== userId) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const plans = getPlansByClient(clientId, userId);
    res.json({ plans });
  });

  // Get a single plan
  app.get("/api/plans/:id", authMiddleware, (req, res) => {
    const id = req.params.id as string;
    const plan = getPlanById(id);
    if (!plan || plan.userId !== getUserId(req)) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    res.json({ plan });
  });

  // Save (create or update) a plan
  app.put("/api/plans/:id", authMiddleware, (req, res) => {
    const userId = getUserId(req);
    const id = req.params.id as string;
    const { clientId, topic, generatedAt, startDate, endDate, status, days } = req.body;

    // SECURITY: Validate ownership of existing plan before update
    const existing = getPlanById(id);
    if (existing && existing.userId !== userId) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    // SECURITY: Validate client ownership
    if (clientId) {
      const client = getClientById(clientId);
      if (!client || client.userId !== userId) {
        res.status(404).json({ error: "Client not found" });
        return;
      }
    }

    const plan = savePlan({
      id,
      clientId,
      userId,
      topic,
      generatedAt,
      startDate,
      endDate,
      status: status || "draft",
      days,
    });
    res.json({ plan });
  });

  // Delete a plan
  app.delete("/api/plans/:id", authMiddleware, (req, res) => {
    const userId = getUserId(req);
    const id = req.params.id as string;
    const existing = getPlanById(id);
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    deletePlan(id, userId);
    res.json({ deleted: true });
  });

  // ============================================================
  // BLOTATO PROXY (protected)
  // ============================================================

  // Fetch connected accounts from Blotato using the client's API key
  app.post("/api/blotato/accounts", authMiddleware, async (req, res) => {
    const { blotatoApiKey } = req.body;
    if (!blotatoApiKey) {
      res.status(400).json({ error: "No Blotato API key provided" });
      return;
    }

    try {
      const accountsRes = await fetch("https://backend.blotato.com/v2/users/me/accounts", {
        headers: { "blotato-api-key": blotatoApiKey },
      });
      if (!accountsRes.ok) {
        const text = await accountsRes.text();
        res.status(accountsRes.status).json({ error: `Blotato API error: ${text}` });
        return;
      }
      const accountsData = await accountsRes.json();
      const accounts = Array.isArray(accountsData) ? accountsData : accountsData.items || [];

      // For each account, fetch subaccounts (needed for Facebook/LinkedIn pageIds)
      const enriched = [];
      for (const account of accounts) {
        let subaccounts: unknown[] = [];
        try {
          const subRes = await fetch(`https://backend.blotato.com/v2/users/me/accounts/${account.id}/subaccounts`, {
            headers: { "blotato-api-key": blotatoApiKey },
          });
          if (subRes.ok) {
            const subData = await subRes.json();
            subaccounts = Array.isArray(subData) ? subData : subData.items || [];
          }
        } catch {
          // Subaccounts may not exist for all platforms
        }
        enriched.push({ ...account, subaccounts });
      }

      res.json({ accounts: enriched });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // ============================================================
  // MEDIA ROUTES (protected)
  // ============================================================

  app.post("/api/media/upload", authMiddleware, upload.array("files", 20), async (req, res) => {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      res.status(500).json({ error: "AWS credentials not configured" });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files provided" });
      return;
    }

    const userId = getUserId(req);
    const clientId = req.body.clientId || "default";
    const planId = req.body.planId || "unassigned";

    // SECURITY: Validate client ownership if a real clientId is provided
    if (clientId !== "default") {
      const client = getClientById(clientId);
      if (!client || client.userId !== userId) {
        res.status(404).json({ error: "Client not found" });
        return;
      }
    }

    const results = [];
    for (const file of files) {
      // SECURITY: Sanitize filename to prevent path traversal
      const safeName = sanitizeFilename(file.originalname);
      const key = `${clientId}/${planId}/${safeName}`;
      const contentType = file.mimetype || "application/octet-stream";

      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
      }));

      const url = `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
      results.push({ name: file.originalname, url, key, size: file.size, contentType });
    }

    res.json({ uploaded: results });
  });

  app.get("/api/media/list", authMiddleware, async (req, res) => {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      res.status(500).json({ error: "AWS credentials not configured" });
      return;
    }

    const userId = getUserId(req);
    const clientId = (req.query.clientId as string) || "default";
    const planId = (req.query.planId as string) || "unassigned";

    // SECURITY: Validate client ownership
    if (clientId !== "default") {
      const client = getClientById(clientId);
      if (!client || client.userId !== userId) {
        res.status(404).json({ error: "Client not found" });
        return;
      }
    }

    const prefix = `${clientId}/${planId}/`;

    const response = await s3.send(new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
    }));

    const files = (response.Contents || []).map((obj) => ({
      key: obj.Key,
      name: obj.Key?.replace(prefix, ""),
      url: `https://${S3_BUCKET}.s3.amazonaws.com/${obj.Key}`,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));

    res.json({ files });
  });

  app.delete("/api/media", authMiddleware, async (req, res) => {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      res.status(500).json({ error: "AWS credentials not configured" });
      return;
    }

    const userId = getUserId(req);
    const key = req.query.key as string;
    if (!key) {
      res.status(400).json({ error: "Missing key parameter" });
      return;
    }

    // SECURITY: Validate key belongs to a client owned by this user
    const keyClientId = key.split("/")[0];
    if (keyClientId && keyClientId !== "default") {
      const client = getClientById(keyClientId);
      if (!client || client.userId !== userId) {
        res.status(404).json({ error: "File not found" });
        return;
      }
    }

    // SECURITY: Prevent path traversal in S3 key
    if (key.includes("..")) {
      res.status(400).json({ error: "Invalid key" });
      return;
    }

    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    res.json({ deleted: key });
  });

  // ============================================================
  // AI IMAGE GENERATION (protected)
  // ============================================================

  app.post("/api/ai/generate-image", authMiddleware, async (req, res) => {
    const { prompt, imageStyle, aspectRatio, engine, referenceImageUrls } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "Missing prompt" });
      return;
    }

    try {
      if (engine === "dalle") {
        // --- DALL-E 3 ---
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          res.status(500).json({ error: "OPENAI_API_KEY not configured" });
          return;
        }

        const dalleStyle = imageStyle === "vivid" ? "vivid" : "natural";
        const sizeMap: Record<string, string> = {
          "square": "1024x1024",
          "portrait": "1024x1792",
          "landscape": "1792x1024",
        };
        const size = sizeMap[aspectRatio] || "1024x1024";

        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt,
            n: 1,
            size,
            quality: "hd",
            style: dalleStyle,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          res.status(response.status).json({ error: `OpenAI API error: ${errText}` });
          return;
        }

        const data = await response.json() as { data: Array<{ url: string; revised_prompt?: string }> };
        res.json({ imageUrl: data.data[0].url, revisedPrompt: data.data[0].revised_prompt });

      } else if (engine === "kontext") {
        // --- Flux Kontext (character consistency) ---
        const bflKey = process.env.BFL_API_KEY;
        if (!bflKey) {
          res.status(500).json({ error: "BFL_API_KEY not configured" });
          return;
        }

        const refUrls = Array.isArray(referenceImageUrls) ? referenceImageUrls as string[] : [];
        if (refUrls.length === 0) {
          res.status(400).json({ error: "Character Match requires at least one reference photo. Upload them in Settings → Reference Photos." });
          return;
        }

        // Kontext uses aspect_ratio string instead of width/height
        const arMap: Record<string, string> = {
          "square": "1:1",
          "portrait": "9:16",
          "landscape": "16:9",
        };

        // Build the request body with input images
        const kontextBody: Record<string, unknown> = {
          prompt,
          aspect_ratio: arMap[aspectRatio] || "1:1",
          safety_tolerance: 2,
          output_format: "png",
        };

        // Kontext accepts up to 4 input images
        refUrls.slice(0, 4).forEach((url, i) => {
          const key = i === 0 ? "input_image" : `input_image_${i + 1}`;
          kontextBody[key] = url;
        });

        const submitRes = await fetch("https://api.bfl.ai/v1/flux-kontext-pro", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "x-key": bflKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(kontextBody),
        });

        if (!submitRes.ok) {
          const errText = await submitRes.text();
          res.status(submitRes.status).json({ error: `Kontext API error: ${errText}` });
          return;
        }

        const submitData = await submitRes.json() as { id: string; polling_url?: string };
        const taskId = submitData.id;
        const pollingUrl = submitData.polling_url || `https://api.bfl.ai/v1/get_result?id=${taskId}`;

        // Poll for result (max 90 seconds — Kontext can be slower)
        let imageUrl: string | null = null;
        for (let i = 0; i < 90; i++) {
          await new Promise((r) => setTimeout(r, 1000));

          const pollRes = await fetch(pollingUrl, {
            headers: { "Accept": "application/json", "x-key": bflKey },
          });

          if (!pollRes.ok) continue;

          const pollData = await pollRes.json() as {
            status: string;
            result?: { sample?: string; url?: string };
          };

          if (pollData.status === "Ready" && pollData.result) {
            imageUrl = pollData.result.sample || pollData.result.url || null;
            break;
          } else if (pollData.status === "Error") {
            res.status(500).json({ error: "Kontext generation failed" });
            return;
          }
        }

        if (!imageUrl) {
          res.status(504).json({ error: "Kontext generation timed out after 90 seconds" });
          return;
        }

        res.json({ imageUrl });

      } else {
        // --- Flux Pro (default) ---
        const bflKey = process.env.BFL_API_KEY;
        if (!bflKey) {
          res.status(500).json({ error: "BFL_API_KEY not configured" });
          return;
        }

        // Map aspect ratio to pixel dimensions
        const dimensions: Record<string, { width: number; height: number }> = {
          "square": { width: 1024, height: 1024 },
          "portrait": { width: 768, height: 1344 },
          "landscape": { width: 1344, height: 768 },
        };
        const { width, height } = dimensions[aspectRatio] || dimensions["square"];

        // Step 1: Submit generation request
        const submitRes = await fetch("https://api.bfl.ai/v1/flux-2-pro", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "x-key": bflKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            width,
            height,
            safety_tolerance: 2,
            output_format: "png",
          }),
        });

        if (!submitRes.ok) {
          const errText = await submitRes.text();
          res.status(submitRes.status).json({ error: `Flux API error: ${errText}` });
          return;
        }

        const submitData = await submitRes.json() as { id: string; polling_url?: string };
        const taskId = submitData.id;
        const pollingUrl = submitData.polling_url || `https://api.bfl.ai/v1/get_result?id=${taskId}`;

        // Step 2: Poll for result (max 60 seconds)
        let imageUrl: string | null = null;
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 1000));

          const pollRes = await fetch(pollingUrl, {
            headers: {
              "Accept": "application/json",
              "x-key": bflKey,
            },
          });

          if (!pollRes.ok) continue;

          const pollData = await pollRes.json() as {
            status: string;
            result?: { sample?: string; url?: string };
          };

          if (pollData.status === "Ready" && pollData.result) {
            imageUrl = pollData.result.sample || pollData.result.url || null;
            break;
          } else if (pollData.status === "Error") {
            res.status(500).json({ error: "Flux generation failed" });
            return;
          }
          // Otherwise status is "Pending" — keep polling
        }

        if (!imageUrl) {
          res.status(504).json({ error: "Flux generation timed out after 60 seconds" });
          return;
        }

        res.json({ imageUrl });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // Save an AI-generated image to S3
  app.post("/api/ai/save-generated", authMiddleware, async (req, res) => {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      res.status(500).json({ error: "AWS credentials not configured" });
      return;
    }

    const userId = getUserId(req);
    const { imageUrl, clientId, dayNumber } = req.body;
    if (!imageUrl) {
      res.status(400).json({ error: "Missing imageUrl" });
      return;
    }

    // SECURITY: Validate client ownership
    if (clientId && clientId !== "default") {
      const client = getClientById(clientId);
      if (!client || client.userId !== userId) {
        res.status(404).json({ error: "Client not found" });
        return;
      }
    }

    // SECURITY: Restrict fetch to known AI image hosts to prevent SSRF
    const allowedHosts = ["oaidalleapiprodscus.blob.core.windows.net", "delivery-bfl.ai", "bfl.ai", "replicate.delivery"];
    try {
      const parsedUrl = new URL(imageUrl);
      if (!allowedHosts.some(h => parsedUrl.hostname.endsWith(h))) {
        res.status(400).json({ error: "Image URL must be from a supported AI provider" });
        return;
      }
    } catch {
      res.status(400).json({ error: "Invalid image URL" });
      return;
    }

    try {
      // Fetch the image from AI provider's temporary URL
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error("Failed to fetch generated image");

      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const safeClientId = (clientId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeDayNum = String(dayNumber || "x").replace(/[^a-zA-Z0-9]/g, "");
      const key = `${safeClientId}/ai-generated/day${safeDayNum}-${crypto.randomUUID()}.png`;

      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "image/png",
      }));

      const url = `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
      res.json({ url, key });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // ============================================================
  // STATIC FILES + SPA
  // ============================================================

  const clientDist = path.join(__dirname, "..", "client");
  app.use(express.static(clientDist));

  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });

  server.listen(PORT, () => {
    console.log(`Social Agency server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
