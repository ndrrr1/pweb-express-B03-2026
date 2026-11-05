import { Router } from "express";
import type { Database } from "../lib/database.js";
import { catalogController } from "../controllers/catalog.controller.js";
import { playerController } from "../controllers/player.controller.js";
import { statisticsController } from "../controllers/statistics.controller.js";

export function apiRoutes(db: Database) {
  const router = Router();
  const catalog = catalogController(db);
  const player = playerController(db);
  router.get("/heroes", catalog.listHeroes);
  router.get("/heroes/:hero_id", catalog.heroDetail);
  router.post("/heroes", catalog.createHero);
  router.get("/skins", catalog.listSkins);
  router.get("/skins/:skin_id", catalog.skinDetail);
  router.get("/players", player.list);
  router.post("/players", player.create);
  router.get("/players/:player_id", player.detail);
  router.patch("/players/:player_id", player.update);
  router.delete("/players/:player_id", player.delete);
  router.post("/players/:player_id/topup", player.topup);
  router.post("/players/:player_id/matches", player.match);
  router.post("/players/:player_id/heroes", player.purchase);
  router.get("/statistics", statisticsController(db));
  return router;
}
