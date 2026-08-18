import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // 5174 so this can run alongside the earlier scaffold in ../frontend.
    port: 5174,
    // Pages call /api/v1/... same-origin; Vite forwards to the FastAPI server.
    proxy: {
      "/api": { target: "http://127.0.0.1:4000", changeOrigin: true },
    },
  },
});
