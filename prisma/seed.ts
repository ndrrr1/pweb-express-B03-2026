import "dotenv/config";
import { createDatabase } from "../src/lib/database.js";
import { seedDatabase } from "./seed-data.js";

if (!process.env.DATABASE_URL)
  throw new Error("Isi DATABASE_URL di .env dahulu.");
const db = createDatabase(process.env.DATABASE_URL);
try {
  await seedDatabase(db);
  console.log(
    "Seed selesai: 133 hero, 892 skin, 3 player, dan 4 kepemilikan hero.",
  );
} finally {
  await db.$disconnect();
}
