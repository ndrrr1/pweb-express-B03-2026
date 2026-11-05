import express from "express";
import { fileURLToPath } from "node:url";
import type { Database } from "./lib/database.js";
import { apiRoutes } from "./routes/api.routes.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { logger } from "./middleware/logger.js";
import { buildCollection } from "./lib/collection.js";

export function createApp(
  db: Database,
  {
    log = true,
    mode = "neon",
  }: { log?: boolean; mode?: "local" | "neon" | "test" } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  if (log) app.use(logger);
  app.use((_req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use(express.json({ limit: "64kb" }));
  app.get("/health", async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({
      status: true,
      message: "MLBB Shop API berjalan",
      data: { service: "mlbb-shop", database: "connected", mode },
    });
  });
  app.use("/api", apiRoutes(db));
  app.get("/postman/collection.json", async (_req, res) => {
    res
      .attachment("MLBB-Shop-28-Testcase.postman_collection.json")
      .json(await buildCollection(app.locals.baseUrl));
  });
  app.use(
    express.static(fileURLToPath(new URL("../public/", import.meta.url))),
  );
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
