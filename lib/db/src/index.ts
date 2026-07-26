import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL is required to initialize the database.");
}

export const client = postgres(connectionString, {
  max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
  prepare: false,
});

export const db = drizzle(client, { schema });

export * from "./schema";
