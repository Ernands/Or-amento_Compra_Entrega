import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  plugins: [react()],
  base: repositoryName ? `/${repositoryName}/` : "/",
  resolve: {
    alias: { "@": path.resolve("src") },
  },
  server: { port: 3000 },
  preview: { port: 4173 },
});
