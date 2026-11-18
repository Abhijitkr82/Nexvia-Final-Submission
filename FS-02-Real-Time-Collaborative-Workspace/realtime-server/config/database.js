import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.ts";

const connectionString =
  process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL_POOLED or DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

export const prisma = new PrismaClient({
  adapter,
});

export async function connectDatabase() {
  await prisma.$connect();
  console.log("Realtime server connected to PostgreSQL");
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log("Realtime server disconnected from PostgreSQL");
}