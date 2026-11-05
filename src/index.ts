import "dotenv/config";
import { createApp } from "./app.js";
import { createDatabase } from "./lib/database.js";
import { serve, closeOnSignal } from "./lib/serve.js";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(
    "DATABASE_URL belum diisi. Jalankan npm run setup dan masukkan koneksi Neon milikmu.",
  );
  process.exit(1);
}
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT harus angka 1–65535.");
  process.exit(1);
}
const db = createDatabase(url);
try {
  await db.$connect();
  const { server, url } = await serve(
    createApp(db, { mode: "neon" }),
    port,
    process.env.HOST || "127.0.0.1",
  );
  closeOnSignal(server, () => db.$disconnect());
  console.log(
    `\nMLBB SHOP SIAP — NEON\nWebsite : ${url}\nHealth  : ${url}/health\nPostman : ${url}/postman/collection.json\nTekan Ctrl+C untuk berhenti.\n`,
  );
} catch (error) {
  console.error(
    "Koneksi Neon gagal. Periksa URL pooled pada .env dan koneksi internet. Detail:",
    error instanceof Error ? error.message : error,
  );
  await db.$disconnect();
  process.exitCode = 1;
}
