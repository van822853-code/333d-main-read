const apiBase = process.env.TEST_API_BASE || "https://333d-main-read.vercel.app";

function makeTinyPng() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
}

function describeCoverMode(coverUrl: string) {
  if (coverUrl.startsWith("https://firebasestorage.googleapis.com/")) return "firebase-storage";
  if (coverUrl.startsWith("data:image/")) return "inline-firestore-fallback";
  return "unknown";
}

async function main() {
  const formData = new FormData();
  formData.append("name", "api-smoke-test-delete-me");
  formData.append("workCount", "1");
  formData.append("workUrl-0", "https://example.com/smoke-test");
  formData.append("cover-0", new Blob([makeTinyPng()], { type: "image/png" }), "smoke.png");

  const createResponse = await fetch(`${apiBase}/api/submissions`, {
    method: "POST",
    body: formData,
  });
  const createText = await createResponse.text();
  if (!createResponse.ok) {
    throw new Error(`POST /api/submissions failed with ${createResponse.status}: ${createText}`);
  }

  const submission = JSON.parse(createText);
  const coverUrl = String(submission?.works?.[0]?.coverUrl || "");
  const coverMode = describeCoverMode(coverUrl);
  console.log(`POST /api/submissions: ${createResponse.status}`);
  console.log(`cover mode: ${coverMode}`);
  console.log(`submission id: ${submission.id}`);

  const deleteResponse = await fetch(`${apiBase}/api/submissions?id=${encodeURIComponent(submission.id)}`, {
    method: "DELETE",
  });
  const deleteText = await deleteResponse.text();
  if (!deleteResponse.ok) {
    throw new Error(`DELETE /api/submissions failed with ${deleteResponse.status}: ${deleteText}`);
  }
  console.log(`DELETE /api/submissions?id=...: ${deleteResponse.status}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

