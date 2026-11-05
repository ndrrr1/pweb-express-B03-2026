import { z } from "zod";
import type { Request } from "express";
import { HttpError } from "../middleware/errors.js";

export const MAX_BALANCE = 2147483647;
export const roleSchema = z.enum([
  "TANK",
  "FIGHTER",
  "ASSASSIN",
  "MAGE",
  "MARKSMAN",
  "SUPPORT",
]);
export const laneSchema = z.enum(["EXP", "GOLD", "MID", "JUNGLE", "ROAM"]);
export const raritySchema = z.enum([
  "COMMON",
  "EXCEPTIONAL",
  "DELUXE",
  "EXQUISITE",
  "GRAND",
  "SUPREME",
]);
const money = z.number().int().min(0).max(MAX_BALANCE);
export const heroSchema = z
  .object({
    name: z.string().trim().min(1, "name wajib diisi").max(80),
    role: roleSchema,
    lane: laneSchema,
    releaseYear: z.number().int().min(1).max(9999),
    priceBP: money.nullish().transform((value) => value ?? null),
    priceDiamond: money.nullish().transform((value) => value ?? null),
  })
  .strict();
export const nicknameSchema = z
  .object({
    nickname: z.string().trim().min(1, "nickname wajib diisi").max(60),
  })
  .strict();
export const topupSchema = z
  .object({
    amount: z
      .number()
      .int()
      .positive("amount harus bilangan bulat lebih dari 0")
      .max(MAX_BALANCE),
  })
  .strict();
export const matchSchema = z
  .object({ result: z.enum(["WIN", "LOSE"]) })
  .strict();
export const purchaseSchema = z
  .object({
    heroId: z.number().int().positive(),
    currency: z.enum(["BP", "DIAMOND"]),
  })
  .strict();

export function pathId(req: Request, name: string) {
  const raw = req.params[name];
  if (
    typeof raw !== "string" ||
    !/^[1-9]\d*$/.test(raw) ||
    Number(raw) > MAX_BALANCE
  )
    throw new HttpError(400, `${name} harus bilangan bulat positif`);
  return Number(raw);
}

export function queryText(req: Request, name: string) {
  const value = req.query[name];
  if (value === undefined) return undefined;
  if (typeof value !== "string")
    throw new HttpError(400, `Query ${name} harus satu nilai teks`);
  return value;
}

export function queryInteger(
  req: Request,
  name: string,
  fallback?: number,
  maximum = MAX_BALANCE,
) {
  const value = queryText(req, name);
  if (value === undefined && fallback !== undefined) return fallback;
  if (
    value === undefined ||
    !/^[1-9]\d*$/.test(value) ||
    Number(value) > maximum
  )
    throw new HttpError(
      400,
      `Query ${name} harus bilangan bulat positif, maksimal ${maximum}`,
    );
  return Number(value);
}

export function pagination(req: Request) {
  const page = queryInteger(req, "page", 1);
  const limit = queryInteger(req, "limit", 10, 100);
  if ((page - 1) * limit > MAX_BALANCE)
    throw new HttpError(400, "Halaman terlalu besar");
  return { page, limit, skip: (page - 1) * limit };
}

export function metadata(
  currentPage: number,
  limit: number,
  totalItems: number,
) {
  return {
    currentPage,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
  };
}
