import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}
export const notFound = (what = "Resource") => new HttpError(404, `${what} not found`);

export const asyncHandler = (fn: RequestHandler): RequestHandler => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const i of err.issues) fields[i.path.join(".") || "_"] ??= i.message;
    return res.status(400).json({ error: "Validation failed", fields });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...(err.fields && { fields: err.fields }) });
  if (err?.name === "MulterError") {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "Each photo must be 5 MB or smaller" : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE" ? "A maximum of 5 photos is allowed" : "Upload failed";
    return res.status(400).json({ error: msg });
  }
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON body" });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Request body too large" });
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
