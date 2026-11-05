import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { createConnection, createServer } from "node:net";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { neonConfig } from "@neondatabase/serverless";
import { WebSocketServer } from "ws";
import { createDatabase, type Database } from "./database.js";
import { seedDatabase } from "./seed-data.js";

// Mode lokal eksplisit. Koneksi cloud tetap ditangani index.ts dengan TLS Neon.
export async function createLocalDatabase(dataDir: string) {
  const engine = await PGlite.create(dataDir);
  let tcp: PGLiteSocketServer | undefined;
  let proxy: WebSocketServer | undefined;
  let db: Database | undefined;
  const previous = {
    wsProxy: neonConfig.wsProxy,
    useSecureWebSocket: neonConfig.useSecureWebSocket,
    pipelineConnect: neonConfig.pipelineConnect,
  };
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    try {
      await db?.$disconnect();
    } finally {
      if (proxy) {
        for (const socket of proxy.clients) socket.terminate();
        await new Promise<void>((resolve) => proxy!.close(() => resolve()));
      }
      await tcp?.stop();
      await engine.close();
      Object.assign(neonConfig, previous);
    }
  }
  try {
    await engine.exec(
      'CREATE TABLE IF NOT EXISTS "_MLBBLocalMigrations" (name TEXT PRIMARY KEY, hash TEXT NOT NULL)',
    );
    const migrations = new URL("../../prisma/migrations/", import.meta.url);
    for (const name of (await readdir(migrations, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()) {
      const sql = await readFile(
        new URL(`${name}/migration.sql`, migrations),
        "utf8",
      );
      const hash = createHash("sha256").update(sql).digest("hex");
      const applied = await engine.query<{ hash: string }>(
        'SELECT hash FROM "_MLBBLocalMigrations" WHERE name=$1',
        [name],
      );
      if (applied.rows[0]) {
        if (applied.rows[0].hash !== hash)
          throw new Error(
            `Migrasi lokal ${name} sudah berubah. Gunakan folder proyek baru untuk mencoba paket terbaru.`,
          );
        continue;
      }
      await engine.transaction(async (tx) => {
        await tx.exec(sql);
        await tx.query(
          'INSERT INTO "_MLBBLocalMigrations" (name,hash) VALUES ($1,$2)',
          [name, hash],
        );
      });
    }
    const reservation = createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const port = (reservation.address() as { port: number }).port;
    await new Promise<void>((resolve) => reservation.close(() => resolve()));
    tcp = new PGLiteSocketServer({
      db: engine,
      host: "127.0.0.1",
      port,
      maxConnections: 1,
    });
    await tcp.start();
    proxy = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await once(proxy, "listening");
    const wsPort = (proxy.address() as { port: number }).port;
    proxy.on("connection", (socket) => {
      const connection = createConnection({ host: "127.0.0.1", port });
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
    neonConfig.useSecureWebSocket = false; // hanya proxy 127.0.0.1 milik mode lokal
    neonConfig.pipelineConnect = false;
    db = createDatabase(
      `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`,
      { max: 1, idleTimeoutMillis: 0 },
    );
    await db.$connect();
    const [heroes, skins, players] = await Promise.all([
      db.hero.count(),
      db.skin.count(),
      db.player.count(),
    ]);
    if (heroes === 0 && skins === 0 && players === 0) {
      await seedDatabase(db);
      console.log("Seed lokal siap: 133 hero, 892 skin, 3 player.");
    } else {
      console.log(
        `Data lokal dipertahankan: ${heroes} hero, ${skins} skin, ${players} player.`,
      );
    }
    return { db, close };
  } catch (error) {
    await close();
    throw error;
  }
}
