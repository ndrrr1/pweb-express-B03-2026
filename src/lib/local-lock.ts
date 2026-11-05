import { mkdir, open, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export async function acquireLocalLock(path: string) {
  await mkdir(dirname(path), { recursive: true });
  const token = randomUUID();
  let record: { pid: number; token: string; url?: string } = {
    pid: process.pid,
    token,
  };
  for (let attempt = 0; ; attempt++) {
    try {
      const handle = await open(path, "wx");
      await handle.writeFile(JSON.stringify(record));
      await handle.close();
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || attempt >= 2)
        throw error;
      let previous: { pid?: number; url?: string };
      try {
        previous = JSON.parse(await readFile(path, "utf8"));
      } catch {
        throw new Error(
          "File pengunci lokal belum dapat dibaca. Pastikan terminal server lain sudah ditutup, lalu coba lagi.",
        );
      }
      let alive = true;
      try {
        process.kill(previous.pid || 0, 0);
      } catch (check) {
        if ((check as NodeJS.ErrnoException).code === "ESRCH") alive = false;
      }
      if (alive)
        throw new Error(
          `Server lokal dari folder ini masih berjalan${previous.url ? ` di ${previous.url}` : ""}. Gunakan terminal tersebut atau hentikan dengan Ctrl+C sebelum memulai lagi.`,
        );
      await unlink(path).catch((remove: NodeJS.ErrnoException) => {
        if (remove.code !== "ENOENT") throw remove;
      });
    }
  }
  return {
    async setUrl(url: string) {
      record = { ...record, url };
      await writeFile(path, JSON.stringify(record));
    },
    async release() {
      try {
        const current = JSON.parse(await readFile(path, "utf8"));
        if (current.token === token) await unlink(path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    },
  };
}
