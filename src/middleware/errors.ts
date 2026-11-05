import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function prismaCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(
    new HttpError(404, `Endpoint ${req.method} ${req.path} tidak ditemukan`),
  );
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof HttpError)
    return res
      .status(error.statusCode)
      .json({ status: false, message: error.message });
  if (error instanceof ZodError)
    return res
      .status(400)
      .json({
        status: false,
        message: error.issues
          .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
          .join("; "),
      });
  const typed = error as { type?: string };
  if (typed?.type === "entity.parse.failed")
    return res
      .status(400)
      .json({
        status: false,
        message: "Body JSON tidak valid. Periksa tanda kutip dan koma.",
      });
  if (typed?.type === "entity.too.large")
    return res
      .status(413)
      .json({ status: false, message: "Body request terlalu besar" });
  if (prismaCode(error) === "P2002")
    return res
      .status(409)
      .json({
        status: false,
        message: "Nama, nickname, atau kepemilikan hero sudah terdaftar",
      });
  console.error("[server]", error);
  return res
    .status(500)
    .json({ status: false, message: "Terjadi kesalahan pada server" });
}
