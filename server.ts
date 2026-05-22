import express from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

interface SubmittedWork {
  id: string;
  url: string;
  coverUrl: string;
  createdAt: string;
}

interface DesignerSubmission {
  id: string;
  name: string;
  createdAt: string;
  works: SubmittedWork[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
const dbPath = path.join(dataDir, 'submissions.json');
const app = express();
const port = Number(process.env.API_PORT || 3102);

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await mkdir(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 60,
  },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

async function ensureStorage() {
  await mkdir(uploadsDir, { recursive: true });
  if (!existsSync(dbPath)) {
    await writeFile(dbPath, '[]', 'utf-8');
  }
}

async function readSubmissions(): Promise<DesignerSubmission[]> {
  await ensureStorage();
  const raw = await readFile(dbPath, 'utf-8');
  return JSON.parse(raw) as DesignerSubmission[];
}

async function writeSubmissions(submissions: DesignerSubmission[]) {
  await ensureStorage();
  await writeFile(dbPath, `${JSON.stringify(submissions, null, 2)}\n`, 'utf-8');
}

function absoluteUploadUrl(req: express.Request, filename: string) {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}

app.use(express.json());
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  next();
});
app.options('*', (_req, res) => res.sendStatus(204));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/submissions', async (_req, res, next) => {
  try {
    res.json(await readSubmissions());
  } catch (error) {
    next(error);
  }
});

app.get('/api/works', async (_req, res, next) => {
  try {
    const submissions = await readSubmissions();
    const works = submissions.flatMap((submission) =>
      submission.works.map((work) => ({
        ...work,
        designerName: submission.name,
        submissionId: submission.id,
      }))
    );
    res.json(works);
  } catch (error) {
    next(error);
  }
});

app.post('/api/submissions', upload.any(), async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const workCount = Number(req.body.workCount || 0);
    const files = (req.files || []) as Express.Multer.File[];

    if (!name) {
      res.status(400).json({ error: '姓名不能为空' });
      return;
    }

    const works: SubmittedWork[] = [];
    for (let index = 0; index < workCount; index += 1) {
      const url = String(req.body[`workUrl-${index}`] || '').trim();
      const file = files.find((item) => item.fieldname === `cover-${index}`);
      if (!url || !file) continue;

      works.push({
        id: crypto.randomUUID(),
        url,
        coverUrl: absoluteUploadUrl(req, file.filename),
        createdAt: new Date().toISOString(),
      });
    }

    if (works.length === 0) {
      res.status(400).json({ error: '至少需要提交一个包含链接和封面的作品' });
      return;
    }

    const submission: DesignerSubmission = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      works,
    };
    const submissions = await readSubmissions();
    submissions.unshift(submission);
    await writeSubmissions(submissions);
    res.status(201).json(submission);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/submissions/:id', async (req, res, next) => {
  try {
    const submissions = await readSubmissions();
    const nextSubmissions = submissions.filter((submission) => submission.id !== req.params.id);
    await writeSubmissions(nextSubmissions);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

const distDir = path.join(__dirname, 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : '服务器错误';
  res.status(500).json({ error: message });
});

app.listen(port, '0.0.0.0', async () => {
  await ensureStorage();
  console.log(`API server running at http://127.0.0.1:${port}`);
});
