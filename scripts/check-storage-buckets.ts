import "dotenv/config";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

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
  return serviceAccount as Record<string, string>;
}

function getProjectId(serviceAccount: Record<string, string> | null) {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    serviceAccount?.project_id
  );
}

async function main() {
  const serviceAccount = parseServiceAccount();
  const projectId = getProjectId(serviceAccount);
  const configuredBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;
  const candidates = Array.from(
    new Set(
      [
        configuredBucket,
        projectId ? `${projectId}.firebasestorage.app` : null,
        projectId ? `${projectId}.appspot.com` : null,
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  if (!projectId && !serviceAccount) {
    throw new Error("Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or Firebase project env vars.");
  }
  if (candidates.length === 0) {
    throw new Error("No bucket candidates found. Set FIREBASE_STORAGE_BUCKET or VITE_FIREBASE_STORAGE_BUCKET.");
  }

  if (!getApps().length) {
    initializeApp({
      credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
      projectId,
      storageBucket: configuredBucket || undefined,
    });
  }

  let found = false;
  for (const bucketName of candidates) {
    try {
      const [exists] = await getStorage().bucket(bucketName).exists();
      console.log(`${exists ? "OK" : "MISS"} ${bucketName}`);
      found = found || exists;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`ERROR ${bucketName}: ${message}`);
    }
  }

  if (!found) {
    process.exitCode = 1;
    console.log("No Firebase Storage bucket candidate exists for this project.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

