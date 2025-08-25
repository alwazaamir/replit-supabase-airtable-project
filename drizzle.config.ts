import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://postgres:Decryptedlabs123&@db.tviodwvwiwpfhgoiesbj.supabase.co:5432/postgres",
  },
});
