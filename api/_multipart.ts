import Busboy from "busboy";
import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import type { UploadedCover } from "./_shared.js";

interface MultipartRequest extends IncomingMessage {
  headers: IncomingHttpHeaders;
}

export function parseMultipartForm(req: MultipartRequest) {
  return new Promise<{ fields: Record<string, string>; files: UploadedCover[] }>((resolve, reject) => {
    const fields: Record<string, string> = {};
    const files: UploadedCover[] = [];
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: 8 * 1024 * 1024,
        files: 60,
      },
    });

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (fieldName, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("limit", () => reject(new Error("单张封面图片不能超过 8MB")));
      stream.on("error", reject);
      stream.on("end", () => {
        files.push({
          fieldName,
          filename: info.filename || "upload.png",
          mimeType: info.mimeType || "application/octet-stream",
          buffer: Buffer.concat(chunks),
        });
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", () => resolve({ fields, files }));
    req.pipe(busboy);
  });
}

