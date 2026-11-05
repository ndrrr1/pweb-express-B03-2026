import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";
import { PrismaClient } from "../generated/prisma/client.js";

neonConfig.webSocketConstructor = WebSocket;

export function createDatabase(
  connectionString: string,
  options: { max?: number; idleTimeoutMillis?: number } = {},
) {
  const adapter = new PrismaNeon({
    connectionString,
    max: options.max ?? 10,
    ...(options.idleTimeoutMillis !== undefined ? { idleTimeoutMillis: options.idleTimeoutMillis } : {}),
    connectionTimeoutMillis: 15000,
  });
  return new PrismaClient({ adapter });
}

export type Database = ReturnType<typeof createDatabase>;
