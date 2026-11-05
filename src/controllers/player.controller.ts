import type { Request, Response } from "express";
import type { Database } from "../lib/database.js";
import {
  pathId,
  nicknameSchema,
  topupSchema,
  matchSchema,
  purchaseSchema,
} from "../lib/validation.js";
import { HttpError } from "../middleware/errors.js";
import {
  addBalance,
  buyHero,
  requirePlayer,
} from "../services/player.service.js";

export function playerController(db: Database) {
  return {
    // Endpoint tambahan untuk pemilih player pada frontend; tidak mengubah kontrak endpoint wajib.
    async list(_req: Request, res: Response) {
      const data = await db.player.findMany({ orderBy: { id: "asc" } });
      res.json({
        status: true,
        message: "Berhasil mengambil daftar player",
        data,
      });
    },
    async create(req: Request, res: Response) {
      const input = nicknameSchema.parse(req.body);
      if (await db.player.findUnique({ where: { nickname: input.nickname } }))
        throw new HttpError(409, "Nickname sudah digunakan");
      const data = await db.player.create({ data: input });
      res
        .status(201)
        .json({ status: true, message: "Player berhasil dibuat", data });
    },
    async detail(req: Request, res: Response) {
      const player = await db.player.findUnique({
        where: { id: pathId(req, "player_id") },
        include: {
          heroes: { include: { hero: true }, orderBy: { id: "asc" } },
        },
      });
      if (!player) throw new HttpError(404, "Player tidak ditemukan");
      const data = {
        ...player,
        heroes: player.heroes.map((owned) => ({
          heroId: owned.heroId,
          name: owned.hero.name,
          currency: owned.currency,
          pricePaid: owned.pricePaid,
        })),
      };
      res.json({
        status: true,
        message: "Berhasil mengambil data player",
        data,
      });
    },
    async update(req: Request, res: Response) {
      const id = pathId(req, "player_id");
      await requirePlayer(db, id);
      const input = nicknameSchema.parse(req.body);
      const duplicate = await db.player.findUnique({
        where: { nickname: input.nickname },
      });
      if (duplicate && duplicate.id !== id)
        throw new HttpError(409, "Nickname sudah digunakan player lain");
      const data = await db.player.update({ where: { id }, data: input });
      res.json({
        status: true,
        message: "Nickname player berhasil diperbarui",
        data,
      });
    },
    async delete(req: Request, res: Response) {
      const id = pathId(req, "player_id");
      await requirePlayer(db, id);
      await db.player.delete({ where: { id } });
      res.json({
        status: true,
        message: "Player dan kepemilikan hero berhasil dihapus",
        data: { id },
      });
    },
    async topup(req: Request, res: Response) {
      const { amount } = topupSchema.parse(req.body);
      const playerId = pathId(req, "player_id");
      const updated = await addBalance(db, playerId, "diamond", amount);
      res.json({
        status: true,
        message: "Top up berhasil",
        data: { playerId, amount, diamond: updated.diamond },
      });
    },
    async match(req: Request, res: Response) {
      const { result } = matchSchema.parse(req.body);
      const playerId = pathId(req, "player_id");
      const bpEarned = result === "WIN" ? 300 : 100;
      const updated = await addBalance(db, playerId, "bp", bpEarned);
      res.json({
        status: true,
        message: "Hadiah match berhasil ditambahkan",
        data: { playerId, result, bpEarned, bp: updated.bp },
      });
    },
    async purchase(req: Request, res: Response) {
      const { heroId, currency } = purchaseSchema.parse(req.body);
      const data = await buyHero(
        db,
        pathId(req, "player_id"),
        heroId,
        currency,
      );
      res
        .status(201)
        .json({ status: true, message: "Hero berhasil dibeli", data });
    },
  };
}
