import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";
import type { Express } from "express";
import { buildCollection } from "./collection.js";

export async function serve(
  app: Express,
  preferredPort: number,
  host = "127.0.0.1",
) {
  const server = createServer(app);
  let port = preferredPort;
  for (let attempt = 0; ; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          server.off("error", reject);
          resolve();
        });
      });
      break;
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== "EADDRINUSE" ||
        attempt >= 9 ||
        port >= 65535
      )
        throw error;
      console.log(`Port ${port} sedang dipakai. Mencoba port ${port + 1}...`);
      port++;
    }
  }
  port = (server.address() as { port: number }).port;
  const url = `http://localhost:${port}`;
  app.locals.baseUrl = url;
  try {
    await writeFile(
      new URL(
        "../../postman/MLBB-Shop-28-Testcase.postman_collection.json",
        import.meta.url,
      ),
      JSON.stringify(await buildCollection(url), null, 2) + "\n",
    );
  } catch {
    console.log(
      `Collection di folder tidak dapat diperbarui. Unduh versi port aktif dari ${url}/postman/collection.json`,
    );
  }
  return { server, url };
}

export function closeOnSignal(
  server: ReturnType<typeof createServer>,
  closeDatabase: () => Promise<void>,
) {
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    console.log("\nMenghentikan server dan menyimpan database...");
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      try {
        await closeDatabase();
        clearTimeout(timeout);
        process.exitCode = 0;
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
      }
    });
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
