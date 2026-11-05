import { readFile } from "node:fs/promises";
import type { Database } from "./database.js";
import type { Role, Lane, Rarity } from "../generated/prisma/client.js";

type HeroInput = {
  id: number;
  name: string;
  primaryRole: Role;
  primaryLane: Lane;
  releaseYear: number;
  priceBP: number | null;
  priceDiamond: number | null;
};
type SkinInput = {
  id: number;
  name: string;
  heroId: number;
  rarity: Rarity;
  priceDiamond: number | null;
};

export async function seedDatabase(db: Database) {
  const heroes: HeroInput[] = JSON.parse(
    await readFile(new URL("../../data/heroes.json", import.meta.url), "utf8"),
  );
  const skins: SkinInput[] = JSON.parse(
    await readFile(new URL("../../data/skins.json", import.meta.url), "utf8"),
  );
  if (
    heroes.length !== 133 ||
    skins.length !== 892 ||
    heroes.some((h, i) => h.id !== i + 1) ||
    skins.some((s, i) => s.id !== i + 1)
  )
    throw new Error(
      "Dataset atau urutan ID tidak sesuai modul. Seed dihentikan sebelum menghapus data.",
    );
  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`TRUNCATE "PlayerHero", "Player", "Skin", "Hero" RESTART IDENTITY CASCADE`;
      await tx.hero.createMany({
        data: heroes.map((h) => ({
          name: h.name,
          role: h.primaryRole,
          lane: h.primaryLane,
          releaseYear: h.releaseYear,
          priceBP: h.priceBP,
          priceDiamond: h.priceDiamond,
        })),
      });
      await tx.skin.createMany({
        data: skins.map((s) => ({
          name: s.name,
          heroId: s.heroId,
          rarity: s.rarity,
          priceDiamond: s.priceDiamond,
        })),
      });
      await tx.player.createMany({
        data: [
          { nickname: "ArekITS", bp: 1500, diamond: 75 },
          { nickname: "SangPushRank", bp: 13000, diamond: 2892 },
          { nickname: "MageSurabaya", bp: 10000, diamond: 0 },
        ],
      });
      await tx.playerHero.createMany({
        data: [
          { playerId: 1, heroId: 18, currency: "BP", pricePaid: 2000 },
          { playerId: 1, heroId: 1, currency: "BP", pricePaid: 10800 },
          { playerId: 2, heroId: 84, currency: "DIAMOND", pricePaid: 599 },
          { playerId: 2, heroId: 56, currency: "BP", pricePaid: 32000 },
        ],
      });
    },
    { timeout: 60000 },
  );
}
