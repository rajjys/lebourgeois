// lib/prisma.ts

import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg'
import { pgConfig } from "./dbConnection";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Supabase's certificate is checked against its own root (O-15, lib/dbConnection.ts).
const adapter = new PrismaPg(process.env.DATABASE_URL ? pgConfig(process.env.DATABASE_URL) : {})

const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma
