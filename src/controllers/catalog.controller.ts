import type { Request, Response } from "express";
import type { Database } from "../lib/database.js";
import {
  heroSchema,
  roleSchema,
  raritySchema,
  pagination,
  queryText,
  queryInteger,
  pathId,
  metadata,
} from "../lib/validation.js";
import { HttpError } from "../middleware/errors.js";
import type { Prisma } from "../generated/prisma/client.js";

export function catalogController(db: Database) {
  return {
    async listHeroes(req: Request, res: Response) {
      const { page, limit, skip } = pagination(req);
      const search = queryText(req, "search")?.trim();
      const role = queryText(req, "role");
      const where: Prisma.HeroWhereInput = {
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
        ...(role !== undefined ? { role: roleSchema.parse(role) } : {}),
      };
      const [data, total] = await Promise.all([
        db.hero.findMany({ where, skip, take: limit, orderBy: { id: "asc" } }),
        db.hero.count({ where }),
      ]);
      res.json({
        status: true,
        message: "Berhasil mengambil data hero",
        data,
        metadata: metadata(page, limit, total),
      });
    },
    async heroDetail(req: Request, res: Response) {
      const data = await db.hero.findUnique({
        where: { id: pathId(req, "hero_id") },
        include: { skins: { orderBy: { id: "asc" } } },
      });
      if (!data) throw new HttpError(404, "Hero tidak ditemukan");
      res.json({
        status: true,
        message: "Berhasil mengambil detail hero",
        data,
      });
    },
    async createHero(req: Request, res: Response) {
      const input = heroSchema.parse(req.body);
      if (await db.hero.findUnique({ where: { name: input.name } }))
        throw new HttpError(409, "Nama hero sudah digunakan");
      const data = await db.hero.create({ data: input });
      res
        .status(201)
        .json({ status: true, message: "Hero berhasil ditambahkan", data });
    },
    async listSkins(req: Request, res: Response) {
      const { page, limit, skip } = pagination(req);
      const rarity = queryText(req, "rarity");
      const heroId = queryText(req, "heroId");
      const where: Prisma.SkinWhereInput = {
        ...(rarity !== undefined ? { rarity: raritySchema.parse(rarity) } : {}),
        ...(heroId !== undefined
          ? { heroId: queryInteger(req, "heroId") }
          : {}),
      };
      const [data, total] = await Promise.all([
        db.skin.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: "asc" },
          include: { hero: { select: { name: true } } },
        }),
        db.skin.count({ where }),
      ]);
      res.json({
        status: true,
        message: "Berhasil mengambil data skin",
        data,
        metadata: metadata(page, limit, total),
      });
    },
    async skinDetail(req: Request, res: Response) {
      const data = await db.skin.findUnique({
        where: { id: pathId(req, "skin_id") },
        include: { hero: true },
      });
      if (!data) throw new HttpError(404, "Skin tidak ditemukan");
      res.json({
        status: true,
        message: "Berhasil mengambil detail skin",
        data,
      });
    },
  };
}
