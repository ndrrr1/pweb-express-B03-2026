import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { createServer } from "node:http";
import { acquireLocalLock } from "../src/lib/local-lock.js";
import { serve } from "../src/lib/serve.js";
import { createApp } from "../src/app.js";

const root = fileURLToPath(new URL("../", import.meta.url));
async function start(directory: string) {
  const child = spawn(process.execPath, ["--import", "tsx", "src/local.ts"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: "0",
      MLBB_LOCAL_DIR: directory,
      DATABASE_URL: "",
      DATABASE_URL_UNPOOLED: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const url = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Startup timeout: ${output}`));
    }, 45000);
    child.stdout.on("data", (data) => {
      output += data;
      const match = output.match(/Website\s*:\s*(http:\/\/localhost:\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[1]!);
      }
    });
    child.stderr.on("data", (data) => {
      output += data;
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Startup exited ${code}: ${output}`));
    });
  });
  return { child, url };
}
async function stop(child: ChildProcess) {
  if (child.exitCode !== null) return;
  const exit = once(child, "exit");
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 15000);
  try {
    const [code] = await exit;
    assert.equal(code, 0);
  } finally {
    clearTimeout(timer);
  }
}
test("entry lokal berjalan tanpa .env, transaksi tersimpan setelah restart, reset hanya lokal", async () => {
  const temp = await mkdtemp(join(tmpdir(), "MLBB uji spasi "));
  const directory = join(temp, "data permanen");
  let instance: Awaited<ReturnType<typeof start>> | undefined;
  try {
    instance = await start(directory);
    const health = await (await fetch(instance.url + "/health")).json();
    assert.equal(health.data.mode, "local");
    const heroes = await (await fetch(instance.url + "/api/heroes")).json();
    assert.equal(heroes.metadata.totalItems, 133);
    const skins = await (await fetch(instance.url + "/api/skins")).json();
    assert.equal(skins.metadata.totalItems, 892);
    const player = await fetch(instance.url + "/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "RestartTest" }),
    });
    assert.equal(player.status, 201);
    await fetch(instance.url + "/api/players/4/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 123 }),
    });
    await stop(instance.child);
    instance = await start(directory);
    const saved = await (await fetch(instance.url + "/api/players/4")).json();
    assert.equal(saved.data.nickname, "RestartTest");
    assert.equal(saved.data.diamond, 123);
    await stop(instance.child);
    const reset = spawn(
      process.execPath,
      ["--import", "tsx", "src/local.ts", "--reset"],
      {
        cwd: root,
        env: { ...process.env, MLBB_LOCAL_DIR: directory, PORT: "0" },
        stdio: "ignore",
      },
    );
    const [code] = await once(reset, "exit");
    assert.equal(code, 0);
    instance = await start(directory);
    assert.equal((await fetch(instance.url + "/api/players/4")).status, 404);
    const statistics = await (
      await fetch(instance.url + "/api/statistics")
    ).json();
    assert.equal(statistics.data.totalPlayers, 3);
    assert.equal(statistics.data.totalHeroesOwned, 4);
  } finally {
    if (instance) await stop(instance.child);
    await rm(temp, { recursive: true, force: true });
  }
});

test("port terpakai dialihkan dan collection mengikuti port aktif", async () => {
  const busy = createServer((_req, response) => response.end("busy"));
  busy.listen(0, "127.0.0.1");
  await once(busy, "listening");
  const occupied = (busy.address() as { port: number }).port;
  let result: Awaited<ReturnType<typeof serve>> | undefined;
  try {
    result = await serve(
      createApp({} as never, { log: false, mode: "test" }),
      occupied,
    );
    assert.notEqual(result.url, `http://localhost:${occupied}`);
    const collection = await (
      await fetch(result.url + "/postman/collection.json")
    ).json();
    assert.equal(collection.item.length, 28);
    assert.equal(
      new URL(collection.item[0].request.url.raw).origin,
      result.url,
    );
  } finally {
    if (result)
      await new Promise<void>((resolve) =>
        result!.server.close(() => resolve()),
      );
    await new Promise<void>((resolve) => busy.close(() => resolve()));
  }
});

test("pengunci mencegah dua server menulis database lokal bersamaan", async () => {
  const temp = await mkdtemp(join(tmpdir(), "mlbb-lock-"));
  const path = join(temp, "db.lock");
  const first = await acquireLocalLock(path);
  try {
    await first.setUrl("http://localhost:3000");
    const original = await readFile(path, "utf8");
    await assert.rejects(acquireLocalLock(path), /masih berjalan/);
    assert.equal(await readFile(path, "utf8"), original);
  } finally {
    await first.release();
    await rm(temp, { recursive: true, force: true });
  }
});

test("pengunci dari proses yang sudah mati dapat dipulihkan tanpa menghapus data", async () => {
  const temp = await mkdtemp(join(tmpdir(), "mlbb-recover-"));
  const path = join(temp, "db.lock");
  await writeFile(path, JSON.stringify({ pid: 2147483647, token: "stale" }));
  await writeFile(join(temp, "data.txt"), "data harus tetap ada");
  const lock = await acquireLocalLock(path);
  try {
    assert.equal(
      await readFile(join(temp, "data.txt"), "utf8"),
      "data harus tetap ada",
    );
  } finally {
    await lock.release();
    await rm(temp, { recursive: true, force: true });
  }
});
