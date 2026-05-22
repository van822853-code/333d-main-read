import crypto from "node:crypto";
import path from "node:path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

export interface SubmittedWork {
  id: string;
  url: string;
  coverUrl: string;
  createdAt: string;
  storagePath?: string;
}

export interface DesignerSubmission {
  id: string;
  name: string;
  createdAt: string;
  works: SubmittedWork[];
}

export interface ExhibitionWork extends SubmittedWork {
  designerName: string;
  submissionId: string;
}

export interface UploadedCover {
  fieldName: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const SUBMISSIONS_COLLECTION = process.env.FIREBASE_SUBMISSIONS_COLLECTION || "designerSubmissions";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_INLINE_COVER_SIZE = 900 * 1024;
let resolvedBucketName: string | null = null;

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  const decoded = raw.trim().startsWith("{")
    ? raw.trim()
    : Buffer.from(raw.trim(), "base64").toString("utf8").trim();
  const serviceAccount = JSON.parse(extractJsonObject(decoded));
  if (typeof serviceAccount.private_key === "string") {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
  return serviceAccount;
}

function extractJsonObject(value: string) {
  try {
    JSON.parse(value);
    return value;
  } catch {
    const start = value.indexOf("{");
    if (start === -1) return value;

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < value.length; index += 1) {
      const char = value[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = inString;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) return value.slice(start, index + 1);
      }
    }
    return value;
  }
}

function getProjectId(serviceAccount: Record<string, unknown> | null) {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    (typeof serviceAccount?.project_id === "string" ? serviceAccount.project_id : undefined)
  );
}

function getStorageBucketName() {
  return process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;
}

function getStorageBucketCandidates() {
  getAdminDb();
  const serviceAccount = parseServiceAccount();
  const projectId = getProjectId(serviceAccount);
  const configuredBucket = getStorageBucketName();
  return Array.from(
    new Set(
      [
        resolvedBucketName,
        configuredBucket,
        projectId ? `${projectId}.firebasestorage.app` : null,
        projectId ? `${projectId}.appspot.com` : null,
      ].filter((value): value is string => Boolean(value)),
    ),
  );
}

export function getAdminDb(): Firestore {
  try {
    if (!getApps().length) {
      const serviceAccount = parseServiceAccount();
      const projectId = getProjectId(serviceAccount);

      if (!serviceAccount && !projectId) {
        throw new ApiError(503, "Firebase Admin is not configured");
      }

      initializeApp({
        credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
        projectId,
        storageBucket: getStorageBucketName() || undefined,
      });
    }

    return getFirestore();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("Firebase Admin initialization failed", error);
    throw new ApiError(503, "Firebase Admin is not configured");
  }
}

export function getUploadsBucket() {
  getAdminDb();
  const bucketName = resolvedBucketName || getStorageBucketName();
  const bucket = bucketName ? getStorage().bucket(bucketName) : getStorage().bucket();
  if (!bucket.name) {
    throw new ApiError(503, "Firebase Storage bucket is not configured");
  }
  return bucket;
}

function extFromUpload(file: UploadedCover) {
  const ext = path.extname(file.filename).toLowerCase();
  if (ext) return ext;
  if (file.mimeType === "image/jpeg") return ".jpg";
  if (file.mimeType === "image/webp") return ".webp";
  if (file.mimeType === "image/gif") return ".gif";
  return ".png";
}

async function uploadCover(file: UploadedCover) {
  if (!file.mimeType.startsWith("image/")) {
    throw new ApiError(400, "封面文件必须是图片");
  }
  if (file.buffer.byteLength > MAX_FILE_SIZE) {
    throw new ApiError(400, "单张封面图片不能超过 8MB");
  }

  const token = crypto.randomUUID();
  const storagePath = `designer-submissions/${Date.now()}-${crypto.randomUUID()}${extFromUpload(file)}`;

  const candidates = getStorageBucketCandidates();
  if (candidates.length === 0) {
    throw new ApiError(503, "Firebase Storage bucket is not configured");
  }

  let lastError: unknown = null;
  for (const bucketName of candidates) {
    const bucket = getStorage().bucket(bucketName);
    try {
      await bucket.file(storagePath).save(file.buffer, {
        contentType: file.mimeType,
        resumable: false,
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: token,
          },
        },
      });
      resolvedBucketName = bucket.name;
      return {
        coverUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`,
        storagePath,
      };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!/bucket does not exist|not found/i.test(message)) {
        throw error;
      }
    }
  }

  if (file.buffer.byteLength <= MAX_INLINE_COVER_SIZE) {
    return {
      coverUrl: `data:${file.mimeType};base64,${file.buffer.toString("base64")}`,
    };
  }

  throw lastError || new ApiError(503, "Firebase Storage bucket is not configured");
}

function serializeSubmission(id: string, data: Record<string, unknown>): DesignerSubmission {
  return {
    id,
    name: String(data.name || ""),
    createdAt: String(data.createdAt || new Date(0).toISOString()),
    works: Array.isArray(data.works) ? (data.works as SubmittedWork[]) : [],
  };
}

export async function listSubmissions() {
  const snapshot = await getAdminDb().collection(SUBMISSIONS_COLLECTION).orderBy("createdAt", "desc").get();
  return snapshot.docs.map((doc) => serializeSubmission(doc.id, doc.data()));
}

export async function listWorks(): Promise<ExhibitionWork[]> {
  const submissions = await listSubmissions();
  return submissions.flatMap((submission) =>
    submission.works.map((work) => ({
      ...work,
      designerName: submission.name,
      submissionId: submission.id,
    })),
  );
}

export async function createSubmissionFromInput(
  fields: Record<string, string>,
  files: UploadedCover[],
): Promise<DesignerSubmission> {
  const name = String(fields.name || "").trim();
  const workCount = Number(fields.workCount || 0);

  if (!name) {
    throw new ApiError(400, "姓名不能为空");
  }

  const works: SubmittedWork[] = [];
  for (let index = 0; index < workCount; index += 1) {
    const url = String(fields[`workUrl-${index}`] || "").trim();
    const file = files.find((item) => item.fieldName === `cover-${index}`);
    if (!url || !file) continue;

    const uploaded = await uploadCover(file);
    works.push({
      id: crypto.randomUUID(),
      url,
      coverUrl: uploaded.coverUrl,
      storagePath: uploaded.storagePath,
      createdAt: new Date().toISOString(),
    });
  }

  if (works.length === 0) {
    throw new ApiError(400, "至少需要提交一个包含链接和封面的作品");
  }

  const createdAt = new Date().toISOString();
  const ref = getAdminDb().collection(SUBMISSIONS_COLLECTION).doc();
  const submission: DesignerSubmission = {
    id: ref.id,
    name,
    createdAt,
    works,
  };

  await ref.set(submission);
  return submission;
}

export async function deleteSubmissionById(id: string) {
  if (!id) {
    throw new ApiError(400, "缺少提交记录 ID");
  }

  const ref = getAdminDb().collection(SUBMISSIONS_COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (snapshot.exists) {
    const data = snapshot.data();
    const works = Array.isArray(data?.works) ? (data?.works as SubmittedWork[]) : [];
    const buckets = getStorageBucketCandidates().map((bucketName) => getStorage().bucket(bucketName));
    await Promise.all(
      works
        .map((work) => work.storagePath)
        .filter((storagePath): storagePath is string => Boolean(storagePath))
        .flatMap((storagePath) => buckets.map((bucket) => bucket.file(storagePath).delete({ ignoreNotFound: true }))),
    );
  }

  await ref.delete();
  return { ok: true as const };
}

export function sendApiError(res: { status: (code: number) => { json: (body: unknown) => void } }, error: unknown) {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : "服务器错误";
  res.status(statusCode).json({ error: message });
}
