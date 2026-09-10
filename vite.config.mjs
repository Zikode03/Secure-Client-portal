import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { validateProductionEnvironment } from "./config/production.mjs";
import { productionSecurityPlugin, securityHeaders } from "./config/security-headers.mjs";

export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  // All deployable builds are protected, including custom staging modes.
  if (command === "build") validateProductionEnvironment(env);

  return {
    define: {
      __PORTAL_DEPLOYMENT_BUILD__: JSON.stringify(command === "build"),
    },
    plugins: [react(), tailwindcss(), ...(command === "build" ? [productionSecurityPlugin(env.VITE_API_BASE_URL)] : [])],
    preview: {
      headers: env.VITE_API_BASE_URL?.startsWith("https://") ? securityHeaders(env.VITE_API_BASE_URL) : {},
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_PROXY_TARGET || "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
      testTimeout: 15000,
    },
  };
});
