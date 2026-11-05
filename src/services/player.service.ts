import type { Database } from "../lib/database.js";
import type { Currency } from "../generated/prisma/client.js";
import { HttpError, prismaCode } from "../middleware/errors.js";
import { MAX_BALANCE } from "../lib/validation.js";

export async function requirePlayer(db: Database, id: number) {
  const player = await db.player.findUnique({ where: { id } });
  if (!player) throw new HttpError(404, "Player tidak ditemukan");
  return player;
}

export async function addBalance(
  db: Database,
  playerId: number,
  field: "bp" | "diamond",
  amount: number,
) {
  await requirePlayer(db, playerId);
  try {
    return await db.player.update({
      where: { id: playerId, [field]: { lte: MAX_BALANCE - amount } },
      data: { [field]: { increment: amount } },
    });
  } catch (error) {
    if (prismaCode(error) !== "P2025") throw error;
    await requirePlayer(db, playerId);
    throw new HttpError(
      400,
      "Penambahan melebihi batas saldo yang dapat disimpan",
    );
  }
}

export async function buyHero(
  db: Database,
  playerId: number,
  heroId: number,
  currency: Currency,
) {
  // Urutan pemeriksaan mengikuti nomor 2–6 pada modul. Validasi body dilakukan controller.
  const player = await requirePlayer(db, playerId);
  const hero = await db.hero.findUnique({ where: { id: heroId } });
  if (!hero) throw new HttpError(404, "Hero tidak ditemukan");
  const price = currency === "BP" ? hero.priceBP : hero.priceDiamond;
  if (price === null)
    throw new HttpError(
      400,
      `Hero ${hero.name} tidak bisa dibeli dengan ${currency}`,
    );
  const whereOwned = { playerId_heroId: { playerId, heroId } };
  if (await db.playerHero.findUnique({ where: whereOwned }))
    throw new HttpError(409, `Player sudah memiliki hero ${hero.name}`);
  const balanceField = currency === "BP" ? "bp" : "diamond";
  if (player[balanceField] < price)
    throw new HttpError(
      400,
      `Saldo ${currency} tidak cukup untuk membeli ${hero.name}`,
    );

  try {
    // Dua query dalam array transaction, sesuai instruksi modul.
    // Kondisi gte ikut diperiksa di database sehingga request serentak tidak membuat saldo negatif.
    const [updated] = await db.$transaction([
      db.player.update({
        where: { id: playerId, [balanceField]: { gte: price } },
        data: { [balanceField]: { decrement: price } },
      }),
      db.playerHero.create({
        data: { playerId, heroId, currency, pricePaid: price },
      }),
    ]);
    return {
      hero: { id: hero.id, name: hero.name },
      currency,
      pricePaid: price,
      balance: { bp: updated.bp, diamond: updated.diamond },
    };
  } catch (error) {
    if (prismaCode(error) === "P2002")
      throw new HttpError(409, `Player sudah memiliki hero ${hero.name}`);
    if (prismaCode(error) === "P2025") {
      await requirePlayer(db, playerId);
      if (await db.playerHero.findUnique({ where: whereOwned }))
        throw new HttpError(409, `Player sudah memiliki hero ${hero.name}`);
      throw new HttpError(
        400,
        `Saldo ${currency} tidak cukup untuk membeli ${hero.name}`,
      );
    }
    throw error;
  }
}
