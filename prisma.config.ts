import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "src/lib/prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL") || env("DATABASE_URL"),
  },
});
