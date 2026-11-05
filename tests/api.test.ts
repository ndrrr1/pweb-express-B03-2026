import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import type { Server } from "node:http";
import { testDatabase } from "./database.js";
import { createApp } from "../src/app.js";

let fixture: Awaited<ReturnType<typeof testDatabase>>;
let server: Server;
let base: string;
const original = JSON.parse(
  await readFile(
    new URL("../postman/mlbb-shop-testcase.original.json", import.meta.url),
    "utf8",
  ),
);
const statuses = [
  200, 200, 200, 200, 404, 201, 409, 400, 200, 200, 200, 201, 409, 200, 400,
  200, 400, 201, 201, 409, 400, 200, 200, 409, 200, 200, 404, 404,
];

before(async () => {
  fixture = await testDatabase();
  server = createApp(fixture.db, { log: false }).listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
  if (fixture) await fixture.close();
});

async function request(method: string, path: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    ...(body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  return { status: res.status, body: await res.json() };
}

for (const [index, item] of original.item.entries()) {
  test(item.name, async () => {
    const source = new URL(item.request.url.raw);
    const input = item.request.body
      ? JSON.parse(item.request.body.raw)
      : undefined;
    const result = await request(
      item.request.method,
      source.pathname + source.search,
      input,
    );
    assert.equal(result.status, statuses[index], JSON.stringify(result.body));
    assert.equal(result.body.status, result.status < 400);
    assert.equal(typeof result.body.message, "string");
    const data = result.body.data;
    if (index === 1) assert.equal(result.body.metadata.totalItems, 20);
    if (index === 2) assert.equal(result.body.metadata.totalItems, 10);
    if (index === 3) {
      assert.equal(data.name, "Layla");
      assert.equal(data.skins.length, 11);
    }
    if (index === 5) assert.equal(data.id, 134);
    if (index === 8) assert.equal(result.body.metadata.totalItems, 11);
    if (index === 9) assert.equal(result.body.metadata.totalItems, 98);
    if (index === 10) {
      assert.equal(data.name, "Silverbolt Raiko");
      assert.equal(data.hero.name, "Selena");
    }
    if (index === 11) {
      assert.equal(data.id, 4);
      assert.equal(data.bp, 10000);
      assert.equal(data.diamond, 0);
    }
    if (index === 13) assert.equal(data.diamond, 706);
    if (index === 15) {
      assert.equal(data.bp, 10300);
      assert.equal(data.bpEarned, 300);
    }
    if (index === 17) {
      assert.equal(data.balance.diamond, 107);
      assert.equal(data.pricePaid, 599);
    }
    if (index === 18) {
      assert.equal(data.balance.bp, 8300);
      assert.equal(data.pricePaid, 2000);
    }
    if (index === 21) {
      assert.deepEqual(
        data.heroes
          .map((h: any) => h.heroId)
          .sort((a: number, b: number) => a - b),
        [18, 22],
      );
      assert.equal(data.bp, 8300);
      assert.equal(data.diamond, 107);
    }
    if (index === 22) assert.equal(data.nickname, "MageITS");
    if (index === 24) {
      assert.equal(data.totalPlayers, 4);
      assert.equal(data.totalHeroesOwned, 6);
      assert.equal(data.totalDiamond, 3074);
      assert.deepEqual(data.mostOwnedHero, {
        heroId: 18,
        name: "Layla",
        owners: 2,
      });
      assert.equal(
        data.heroesPerRole.reduce((sum: number, r: any) => sum + r.total, 0),
        134,
      );
    }
  });
}

test("pagination dan filter memakai count yang sama; pencarian tidak peka kapital", async () => {
  const page = await request("GET", "/api/heroes?page=2&limit=5");
  assert.deepEqual(
    page.body.data.map((h: any) => h.id),
    [6, 7, 8, 9, 10],
  );
  const search = await request("GET", "/api/heroes?search=LA&role=MARKSMAN");
  assert.ok(
    search.body.data.every(
      (h: any) => h.role === "MARKSMAN" && h.name.toLowerCase().includes("la"),
    ),
  );
  assert.equal(search.body.metadata.totalItems, search.body.data.length);
  const empty = await request("GET", "/api/heroes?search=___tidakada");
  assert.equal(empty.body.metadata.totalPages, 0);
});

test("query tidak valid dan skin tidak ada dibalas dengan format gagal", async () => {
  for (const query of [
    "page=0",
    "limit=-2",
    "limit=0",
    "role=INVALID",
    "page=1&page=2",
  ])
    assert.equal((await request("GET", "/api/heroes?" + query)).status, 400);
  assert.equal((await request("GET", "/api/skins?rarity=GOLD")).status, 400);
  assert.equal((await request("GET", "/api/skins?heroId=abc")).status, 400);
  assert.equal((await request("GET", "/api/skins/99999")).status, 404);
});

test("validasi berjalan sesuai prioritas pemeriksaan pada modul", async () => {
  assert.equal(
    (await request("POST", "/api/heroes", { name: "Miya" })).status,
    400,
  );
  assert.equal(
    (await request("PATCH", "/api/players/99999", { nickname: "" })).status,
    404,
  );
  assert.equal(
    (await request("POST", "/api/players/99999/topup", { amount: -1 })).status,
    400,
  );
  assert.equal(
    (await request("POST", "/api/players/99999/matches", { result: "DRAW" }))
      .status,
    400,
  );
  assert.equal(
    (
      await request("POST", "/api/players/99999/heroes", {
        heroId: 1,
        currency: "GOLD",
      })
    ).status,
    400,
  );
  const playerFirst = await request("POST", "/api/players/99999/heroes", {
    heroId: 99999,
    currency: "BP",
  });
  assert.equal(playerFirst.status, 404);
  assert.match(playerFirst.body.message, /Player/);
  const ownedFirst = await request("POST", "/api/players/1/heroes", {
    heroId: 1,
    currency: "BP",
  });
  assert.equal(ownedFirst.status, 409);
});

test("topup dan match validasi angka serta LOSE menghasilkan 100 BP", async () => {
  for (const amount of [0, 1.5, "2", 2147483648])
    assert.equal(
      (await request("POST", "/api/players/3/topup", { amount })).status,
      400,
    );
  assert.equal(
    (await request("POST", "/api/players/99999/topup", { amount: 10 })).status,
    404,
  );
  assert.equal(
    (await request("POST", "/api/players/99999/matches", { result: "WIN" }))
      .status,
    404,
  );
  const result = await request("POST", "/api/players/3/matches", {
    result: "LOSE",
  });
  assert.equal(result.body.data.bpEarned, 100);
  assert.equal(result.body.data.bp, 8400);
});

test("pembelian gagal tidak mengubah saldo atau jumlah kepemilikan", async () => {
  const before = await fixture.db.player.findUniqueOrThrow({
    where: { id: 1 },
  });
  const count = await fixture.db.playerHero.count({ where: { playerId: 1 } });
  for (const heroId of [133, 99999])
    assert.ok(
      (
        await request("POST", "/api/players/1/heroes", {
          heroId,
          currency: "BP",
        })
      ).status >= 400,
    );
  assert.deepEqual(
    await fixture.db.player.findUniqueOrThrow({ where: { id: 1 } }),
    before,
  );
  assert.equal(
    await fixture.db.playerHero.count({ where: { playerId: 1 } }),
    count,
  );
});

test("request serentak untuk hero yang sama hanya mendebit saldo sekali", async () => {
  const player = await fixture.db.player.create({
    data: { nickname: "ConcurrentSame" },
  });
  const results = await Promise.all([
    request("POST", `/api/players/${player.id}/heroes`, {
      heroId: 18,
      currency: "BP",
    }),
    request("POST", `/api/players/${player.id}/heroes`, {
      heroId: 18,
      currency: "BP",
    }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(
    (await fixture.db.player.findUniqueOrThrow({ where: { id: player.id } }))
      .bp,
    8000,
  );
  assert.equal(
    await fixture.db.playerHero.count({ where: { playerId: player.id } }),
    1,
  );
});

test("pembelian dua hero serentak tidak membuat saldo negatif", async () => {
  const player = await fixture.db.player.create({
    data: { nickname: "ConcurrentDifferent", bp: 11000 },
  });
  const results = await Promise.all([
    request("POST", `/api/players/${player.id}/heroes`, {
      heroId: 1,
      currency: "BP",
    }),
    request("POST", `/api/players/${player.id}/heroes`, {
      heroId: 18,
      currency: "BP",
    }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 400]);
  const updated = await fixture.db.player.findUniqueOrThrow({
    where: { id: player.id },
  });
  assert.ok(updated.bp >= 0);
  const owned = await fixture.db.playerHero.findMany({
    where: { playerId: player.id },
  });
  assert.equal(owned.length, 1);
  assert.equal(updated.bp, 11000 - owned[0]!.pricePaid);
});

test("cascade PlayerHero→Player dan Skin→Hero berjalan pada database", async () => {
  const player = await fixture.db.player.findUniqueOrThrow({
    where: { nickname: "ConcurrentSame" },
  });
  assert.equal(
    (await request("DELETE", `/api/players/${player.id}`)).status,
    200,
  );
  assert.equal(
    await fixture.db.playerHero.count({ where: { playerId: player.id } }),
    0,
  );
  const hero = await fixture.db.hero.create({
    data: { name: "CascadeTest", role: "MAGE", lane: "MID", releaseYear: 2026 },
  });
  await fixture.db.skin.create({
    data: { name: "Cascade Skin", rarity: "COMMON", heroId: hero.id },
  });
  await fixture.db.hero.delete({ where: { id: hero.id } });
  assert.equal(await fixture.db.skin.count({ where: { heroId: hero.id } }), 0);
});

test("JSON rusak dibalas 400 dan frontend tersedia", async () => {
  const response = await fetch(base + "/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"nickname":',
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).status, false);
  assert.equal((await fetch(base + "/")).status, 200);
});
