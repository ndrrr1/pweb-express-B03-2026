import {
  existsSync,
  mkdirSync,
  readFileSync,
  appendFileSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const log = join(root, "logs", "startup.log");
mkdirSync(dirname(log), { recursive: true });
writeFileSync(
  log,
  `MLBB Shop startup ${new Date().toISOString()}\nNode ${process.version}, ${process.platform}\n`,
);
function output(value, error = false) {
  const safe = String(value).replace(
    /postgres(?:ql)?:\/\/[^\s"'<>]+/gi,
    "[URL_DATABASE_DISEMBUNYIKAN]",
  );
  (error ? process.stderr : process.stdout).write(safe);
  appendFileSync(log, safe);
}
let active;
async function run(args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: ["inherit", "pipe", "pipe"],
    });
    active = child;
    child.stdout.on("data", (chunk) => output(chunk));
    child.stderr.on("data", (chunk) => output(chunk, true));
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      active = undefined;
      code === 0 || signal === "SIGINT"
        ? resolve()
        : reject(
            new Error(
              `Proses berhenti (kode ${code ?? signal}). Lihat pesan tepat di atas.`,
            ),
          );
    });
  });
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    if (process.platform !== "win32") active?.kill(signal);
  });

try {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (!(major >= 24 || (major === 22 && minor >= 12)))
    throw new Error(
      "Gunakan Node.js 24 atau Node.js 22.12 ke atas. Versi Node saat ini belum didukung.",
    );
  for (const path of [
    "package-lock.json",
    "prisma/schema.prisma",
    "data/heroes.json",
    "src/local.ts",
  ]) {
    if (!existsSync(join(root, path)))
      throw new Error(
        "File proyek belum lengkap. Ekstrak SELURUH ZIP ke satu folder sebelum menjalankan JALANKAN.cmd.",
      );
  }
  const lock = createHash("sha256")
    .update(readFileSync("package-lock.json"))
    .digest("hex");
  const stamp = join(root, ".cache", "dependencies.sha256");
  const modules = [
    "express",
    "prisma",
    "tsx",
    "@prisma/client",
    "@prisma/adapter-neon",
    "@electric-sql/pglite",
    "@electric-sql/pglite-socket",
  ];
  const installed = modules.every((name) =>
    existsSync(join(root, "node_modules", name, "package.json")),
  );
  const remembered = existsSync(stamp) ? readFileSync(stamp, "utf8") : "";
  if (!installed || remembered !== lock) {
    const npm = [
      process.env.npm_execpath,
      join(
        dirname(process.execPath),
        "node_modules",
        "npm",
        "bin",
        "npm-cli.js",
      ),
      join(
        dirname(process.execPath),
        "..",
        "lib",
        "node_modules",
        "npm",
        "bin",
        "npm-cli.js",
      ),
    ].find((path) => path && existsSync(path));
    if (!npm)
      throw new Error(
        "npm tidak ditemukan bersama Node.js. Jalankan npm ci dari terminal atau pasang ulang Node.js 24, lalu coba lagi.",
      );
    output(
      "Memasang dependency dari package-lock.json. Tunggu sampai selesai...\n",
    );
    await run([npm, "ci", "--prefer-offline"]);
    mkdirSync(dirname(stamp), { recursive: true });
    writeFileSync(stamp, lock);
  }
  if (
    process.argv.includes("--neon") &&
    !process.argv.includes("--prepare-only")
  ) {
    output("MODE NEON — memeriksa konfigurasi, migrasi, dan data awal.\n");
    await run(["scripts/setup.mjs"]);
    await run(["--import", "tsx", "src/index.ts"]);
  } else {
    output("Membuat Prisma Client...\n");
    await run(["node_modules/prisma/build/index.js", "generate"]);
    if (!process.argv.includes("--prepare-only")) {
      await run([
        "--import",
        "tsx",
        "src/local.ts",
        ...(process.argv.includes("--reset-local") ? ["--reset"] : []),
      ]);
    }
  }
} catch (error) {
  output(
    `\nBELUM BERHASIL: ${error.message}\nLog lengkap: logs/startup.log\n`,
    true,
  );
  process.exitCode = 1;
}
