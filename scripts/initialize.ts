import "dotenv/config";
import { createDatabase } from "../src/lib/database.js";
import { seedDatabase } from "../prisma/seed-data.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diisi.");
const db = createDatabase(process.env.DATABASE_URL);
try {
  const [heroes, skins, players] = await Promise.all([
    db.hero.count(),
    db.skin.count(),
    db.player.count(),
  ]);
  if (heroes === 0 && skins === 0 && players === 0) {
    await seedDatabase(db);
    console.log(
      "Database kosong: seed awal 133 hero, 892 skin, 3 player berhasil.",
    );
  } else
    console.log(
      `Data yang sudah ada dipertahankan: ${heroes} hero, ${skins} skin, ${players} player. Untuk mengulang 28 testcase dari awal: npm run demo:reset.`,
    );
} finally {
  await db.$disconnect();
}
