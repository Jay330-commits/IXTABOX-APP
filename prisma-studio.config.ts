// Configuration for Prisma Studio to use direct connection
// This bypasses the adapter pattern for Studio compatibility
import "dotenv/config";

const studioConfig = {
  schema: "src/lib/prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
};

export default studioConfig;

