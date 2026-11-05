import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const heroes = JSON.parse(
  await readFile(new URL("../data/heroes.json", import.meta.url), "utf8"),
);
const skins = JSON.parse(
  await readFile(new URL("../data/skins.json", import.meta.url), "utf8"),
);
assert.equal(heroes.length, 133);
assert.equal(skins.length, 892);
assert.equal(heroes[0].name, "Miya");
assert.equal(heroes[132].name, "Hirara");
assert.ok(heroes.every((hero, index) => hero.id === index + 1));
assert.ok(
  skins.every(
    (skin, index) =>
      skin.id === index + 1 && heroes.some((hero) => hero.id === skin.heroId),
  ),
);
assert.equal(heroes[21].name, "Freya");
assert.equal(heroes[21].priceBP, null);
assert.equal(skins.filter((skin) => skin.heroId === 18).length, 11);
assert.equal(skins.filter((skin) => skin.rarity === "GRAND").length, 98);
assert.equal(skins[890].name, "Silverbolt Raiko");
console.log(
  "Dataset valid: 133 hero, 892 skin, ID dan nilai penting sesuai testcase modul.",
);
