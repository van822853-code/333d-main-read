import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listWorks, sendApiError } from "./_shared.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    res.status(200).json(await listWorks());
  } catch (error) {
    sendApiError(res, error);
  }
}

