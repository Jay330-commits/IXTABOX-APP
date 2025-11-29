import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "src/lib/prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // For CLI commands: Prefer DIRECT_URL to avoid PgBouncer limitations (hanging, slow introspection)
    // Falls back to DATABASE_URL if DIRECT_URL not set (e.g., in some CI/CD environments)
    url: process.env.DIRECT_URL ? env("DIRECT_URL") : env("DATABASE_URL"),
  },
});
