import { config } from "dotenv";
import { validateEnvironment } from "./env.mjs";

config({ override: true, quiet: true });
const errors = validateEnvironment(process.env);
if (errors.length) {
  console.error(
    `Konfigurasi belum siap:\n${errors.map((error) => `- ${error}`).join("\n")}\nJalankan npm run setup atau edit .env, lalu simpan.`,
  );
  process.exitCode = 1;
} else console.log("Koneksi pooled/direct Neon siap dipakai.");
