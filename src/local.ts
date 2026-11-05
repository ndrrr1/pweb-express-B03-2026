import "dotenv/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createApp } from "./app.js";
import { createLocalDatabase } from "./lib/local-database.js";
import { acquireLocalLock } from "./lib/local-lock.js";
import { serve, closeOnSignal } from "./lib/serve.js";
import { seedDatabase } from "./lib/seed-data.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = resolve(
  process.env.MLBB_LOCAL_DIR || resolve(root, ".local-db"),
);
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error("PORT harus angka 1–65535 (atau 0 untuk port otomatis).");
  process.exit(1);
}
let lock: Awaited<ReturnType<typeof acquireLocalLock>> | undefined;
let database: Awaited<ReturnType<typeof createLocalDatabase>> | undefined;
try {
  lock = await acquireLocalLock(`${directory}.lock`);
  console.log("MODE DEMO LOKAL — menyiapkan PostgreSQL di komputer ini...");
  console.log(
    "Mode ini tidak membutuhkan akun/URL Neon. Data tersimpan di .local-db.",
  );
  database = await createLocalDatabase(directory);
  if (process.argv.includes("--reset")) {
    await seedDatabase(database.db);
    await database.close();
    await lock.release();
    console.log(
      "Reset LOKAL selesai: 133 hero, 892 skin, 3 player, 4 kepemilikan. Database Neon tidak diubah.",
    );
  } else {
    const app = createApp(database.db, { mode: "local" });
    const { server, url } = await serve(app, port);
    await lock.setUrl(url);
    closeOnSignal(server, async () => {
      await database!.close();
      await lock!.release();
    });
    console.log(
      `\nMLBB SHOP SIAP — DEMO LOKAL\nWebsite : ${url}\nHealth  : ${url}/health\nPostman : ${url}/postman/collection.json\nUntuk tugas Neon: npm run start:neon\nTekan Ctrl+C untuk berhenti.\n`,
    );
  }
} catch (error) {
  console.error(
    "Gagal memulai demo lokal:",
    error instanceof Error ? error.message : error,
  );
  try {
    await database?.close();
  } finally {
    await lock?.release();
  }
  process.exitCode = 1;
}
