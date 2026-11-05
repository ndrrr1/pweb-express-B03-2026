import type { Request, Response } from "express";
import type { Database } from "../lib/database.js";

export function statisticsController(db: Database) {
  return async (_req: Request, res: Response) => {
    const [
      totalPlayers,
      totalHeroesOwned,
      totalDiamond,
      mostOwned,
      groupedRoles,
    ] = await Promise.all([
      db.player.count(),
      db.playerHero.count(),
      db.player.aggregate({ _sum: { diamond: true } }),
      db.playerHero.groupBy({
        by: ["heroId"],
        _count: { heroId: true },
        orderBy: [{ _count: { heroId: "desc" } }, { heroId: "asc" }],
        take: 1,
      }),
      db.hero.groupBy({
        by: ["role"],
        _count: { role: true },
        orderBy: [{ _count: { role: "desc" } }, { role: "asc" }],
      }),
    ]);
    const top = mostOwned[0];
    const hero = top
      ? await db.hero.findUnique({ where: { id: top.heroId } })
      : null;
    res.json({
      status: true,
      message: "Berhasil mengambil statistik",
      data: {
        totalPlayers,
        totalHeroesOwned,
        totalDiamond: totalDiamond._sum.diamond ?? 0,
        mostOwnedHero:
          top && hero
            ? { heroId: hero.id, name: hero.name, owners: top._count.heroId }
            : null,
        heroesPerRole: groupedRoles.map((item) => ({
          role: item.role,
          total: item._count.role,
        })),
      },
    });
  };
}
