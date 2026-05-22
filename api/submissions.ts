import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSubmissionFromInput, listSubmissions, sendApiError } from "./_shared.js";
import { parseMultipartForm } from "./_multipart.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      res.status(200).json(await listSubmissions());
    } catch (error) {
      sendApiError(res, error);
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const { fields, files } = await parseMultipartForm(req);
      const submission = await createSubmissionFromInput(fields, files);
      res.status(201).json(submission);
    } catch (error) {
      sendApiError(res, error);
    }
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed" });
}

