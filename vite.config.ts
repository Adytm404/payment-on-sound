import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/pakasir": {
        target: "https://app.pakasir.com",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/pakasir/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
            proxyReq.removeHeader("referer");
            proxyReq.setHeader("host", "app.pakasir.com");
            proxyReq.setHeader("accept", "application/json");
          });
        },
      },
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/pakasir": {
        target: "https://app.pakasir.com",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/pakasir/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
            proxyReq.removeHeader("referer");
            proxyReq.setHeader("host", "app.pakasir.com");
            proxyReq.setHeader("accept", "application/json");
          });
        },
      },
    },
  },
});
