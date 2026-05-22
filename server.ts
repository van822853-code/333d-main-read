import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import "dotenv/config";
import {
  createSubmissionFromInput,
  deleteSubmissionById,
  listSubmissions,
  listWorks,
  sendApiError,
  type UploadedCover,
} from "./api/_shared.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.API_PORT || 3102);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 60,
  },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith("image/"));
  },
});

function toFields(body: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(body).map(([key, value]) => [key, String(value ?? "")]));
}

function toUploadedCovers(files: Express.Multer.File[]): UploadedCover[] {
  return files.map((file) => ({
    fieldName: file.fieldname,
    filename: file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
  }));
}

app.use(express.json());
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  next();
});
app.options("*", (_req, res) => res.sendStatus(204));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, backend: "firebase" });
});

app.get("/api/submissions", async (_req, res) => {
  try {
    res.json(await listSubmissions());
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/works", async (_req, res) => {
  try {
    res.json(await listWorks());
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/submissions", upload.any(), async (req, res) => {
  try {
    const submission = await createSubmissionFromInput(
      toFields(req.body),
      toUploadedCovers((req.files || []) as Express.Multer.File[]),
    );
    res.status(201).json(submission);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.delete("/api/submissions/:id", async (req, res) => {
  try {
    res.json(await deleteSubmissionById(req.params.id));
  } catch (error) {
    sendApiError(res, error);
  }
});

const distDir = path.join(__dirname, "dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, "0.0.0.0", () => {
  console.log(`API server running at http://127.0.0.1:${port}`);
});
