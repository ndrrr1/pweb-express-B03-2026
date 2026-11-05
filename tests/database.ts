import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { createServer, createConnection } from "node:net";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { WebSocketServer } from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { createDatabase } from "../src/lib/database.js";
import { seedDatabase } from "../prisma/seed-data.js";

// Khusus pengujian: PostgreSQL WASM + proxy WebSocket lokal.
// Aplikasi tetap memakai PrismaNeon yang sama dengan koneksi Neon produksi.
export async function testDatabase() {
  const engine = await PGlite.create();
  await engine.exec(
    await readFile(
      new URL(
        "../prisma/migrations/20261104000100_init/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const tcpPort = (reservation.address() as { port: number }).port;
  await new Promise<void>((resolve) => reservation.close(() => resolve()));
  const tcp = new PGLiteSocketServer({
    db: engine,
    host: "127.0.0.1",
    port: tcpPort,
  });
  await tcp.start();
  const proxy = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await once(proxy, "listening");
  const wsPort = (proxy.address() as { port: number }).port;
  proxy.on("connection", (socket) => {
    const connection = createConnection({ host: "127.0.0.1", port: tcpPort });
    socket.on("message", (data) =>
      connection.write(
        Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer),
      ),
    );
    connection.on("data", (data) => {
      if (socket.readyState === 1) socket.send(data);
    });
    connection.on("error", () => socket.close());
    connection.on("close", () => socket.close());
    socket.on("close", () => connection.destroy());
    socket.on("error", () => connection.destroy());
  });
  neonConfig.wsProxy = () => `127.0.0.1:${wsPort}`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineConnect = false;
  const db = createDatabase(
    `postgresql://postgres:postgres@127.0.0.1:${tcpPort}/postgres?sslmode=disable`,
    { max: 1, idleTimeoutMillis: 0 },
  );
  await db.$connect();
  await seedDatabase(db);
  return {
    db,
    async close() {
      await db.$disconnect();
      for (const socket of proxy.clients) socket.terminate();
      await new Promise<void>((resolve) => proxy.close(() => resolve()));
      await tcp.stop();
      await engine.close();
    },
  };
}
