import "dotenv/config";
import { defineConfig } from "prisma/config";

const dbUrl = process.env.DATABASE_URL || process.env["DATABASE_URL"] || "";

if (!dbUrl) {
  console.error("❌ ERRO CRÍTICO: A variável de ambiente DATABASE_URL não está configurada no contêiner!");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: dbUrl,
  },
});
