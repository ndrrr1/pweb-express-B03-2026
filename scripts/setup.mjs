import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { parse } from "dotenv";
import {
  validateEnvironment,
  normalizeConnectionString,
  directFromPooled,
} from "./env.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const envFile = new URL("../.env", import.meta.url);
let env;
try {
  env = parse(await readFile(envFile));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  await writeFile(
    envFile,
    await readFile(new URL("../.env.example", import.meta.url)),
  );
  env = {};
}

env.DATABASE_URL = normalizeConnectionString(env.DATABASE_URL);
env.DATABASE_URL_UNPOOLED =
  normalizeConnectionString(env.DATABASE_URL_UNPOOLED) ||
  directFromPooled(env.DATABASE_URL);
env.PORT ||= "3000";
if (validateEnvironment(env).length) {
  console.log(
    "Persiapan satu kali: buka Neon Console > Connect, pilih satu branch.",
  );
  if (!process.stdin.isTTY) {
    console.error(
      "Isi DATABASE_URL (pooling ON) dan DATABASE_URL_UNPOOLED (pooling OFF) pada .env, lalu ulangi npm run setup.",
    );
    process.exit(1);
  }
  const input = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    env.DATABASE_URL = normalizeConnectionString(
      await input.question(
        "Tempel koneksi Neon pooling ON (URL atau perintah psql): ",
      ),
    );
    env.DATABASE_URL_UNPOOLED =
      normalizeConnectionString(
        await input.question(
          "URL pooling OFF (boleh Enter untuk dibuat otomatis): ",
        ),
      ) || directFromPooled(env.DATABASE_URL);
  } finally {
    input.close();
  }
  env.PORT ||= "3000";
  const errors = validateEnvironment(env);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
}
await writeFile(
  envFile,
  Object.entries(env)
    .map(([key, value]) => `${key}=${JSON.stringify(String(value))}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);

async function run(args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Langkah setup berhenti dengan kode ${code}.`)),
    );
  });
}

try {
  console.log("Membuat Prisma Client...");
  await run(["node_modules/prisma/build/index.js", "generate"]);
  console.log("Menerapkan migrasi yang disertakan...");
  await run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
  await run(["--import", "tsx", "scripts/initialize.ts"]);
  console.log(
    "\nSETUP NEON SELESAI. Jalankan npm run start:neon, lalu buka URL pada terminal. Untuk demo lokal tanpa Neon: npm start.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
