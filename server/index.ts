import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "social-agency-secret-change-me";
// Store data outside dist/ so it persists across deploys
const APP_ROOT = path.join(__dirname, "..", "..");
const USERS_FILE = path.join(APP_ROOT, "data", "users.json");

interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

function loadUsers(): User[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    }
  } catch {}
  return [];
}

function saveUsers(users: User[]) {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
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

async function startServer() {
  const app = express();
  const server = createServer(app);
  const PORT = process.env.PORT || 3003;

  app.use(express.json({ limit: "2mb" }));

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

  // --- Auth routes (public) ---

  app.post("/api/auth/register", async (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      res.status(400).json({ error: "Email, name, and password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const users = loadUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id: `user_${Date.now()}`,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    saveUsers(users);

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const users = loadUsers();
    const user = users.find((u) => u.email === email.toLowerCase().trim());
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
    const userId = (req as unknown as Record<string, unknown>).userId as string;
    const users = loadUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  });

  // --- Protected API routes ---

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

  // --- Media upload routes (protected) ---

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

    const clientId = req.body.clientId || "default";
    const planId = req.body.planId || "unassigned";

    const results = [];
    for (const file of files) {
      const key = `${clientId}/${planId}/${file.originalname}`;
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

    const clientId = (req.query.clientId as string) || "default";
    const planId = (req.query.planId as string) || "unassigned";
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

    const key = req.query.key as string;
    if (!key) {
      res.status(400).json({ error: "Missing key parameter" });
      return;
    }
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    res.json({ deleted: key });
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
