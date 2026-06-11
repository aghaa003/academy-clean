import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const port = Number(process.env.PORT ?? 5173);
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
  proxy: {
    // Use 127.0.0.1 (not "localhost"): on Windows "localhost" resolves to IPv6
    // ::1 first, but the PHP dev server only listens on IPv4, causing a ~200ms
    // connection-fallback delay on every proxied request.
    "/api": {
      target: "http://127.0.0.1:8000",
      changeOrigin: true,
    },
    "/sanctum": {
      target: "http://127.0.0.1:8000",
      changeOrigin: true,
    },
    "/storage": {
      target: "http://127.0.0.1:8000",
      changeOrigin: true,
    },
    "/auth": {
      target: "http://127.0.0.1:8000",
      changeOrigin: true,
    },
  },
},
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
