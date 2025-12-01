import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "src/lib/prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // For Prisma v7, use DIRECT_URL for migrations to bypass PgBouncer pooling
  datasource: {
    // Use Prisma's env() helper which returns `string` and integrates with the
    // Prisma config typings. Falls back to DATABASE_URL if DIRECT_URL isn't set.
    url: env("DIRECT_URL") || env("DATABASE_URL"),
  },
});
