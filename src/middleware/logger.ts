import type { Request, Response, NextFunction } from "express";

export function logger(req: Request, res: Response, next: NextFunction) {
  const started = performance.now();
  res.on("finish", () =>
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${Math.round(performance.now() - started)}ms`,
    ),
  );
  next();
}
