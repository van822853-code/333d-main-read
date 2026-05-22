import type { VercelRequest, VercelResponse } from "@vercel/node";
import { deleteSubmissionById, sendApiError } from "../_shared.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  try {
    res.status(200).json(await deleteSubmissionById(id || ""));
  } catch (error) {
    sendApiError(res, error);
  }
}

