import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { validateProductionEnvironment } from "./config/production.mjs";
import { productionSecurityPlugin, securityHeaders } from "./config/security-headers.mjs";

export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const isLocalBuildCheck = command === "build" && mode === "local-check";
  const isDeployableBuild = command === "build" && !isLocalBuildCheck;

  // Real deployable builds stay protected by the production environment checks.
  // local-check only verifies that TypeScript and Vite can compile the frontend on a developer machine.
  if (isDeployableBuild) validateProductionEnvironment(env);

  return {
    define: {
      __PORTAL_DEPLOYMENT_BUILD__: JSON.stringify(isDeployableBuild),
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(isDeployableBuild ? [productionSecurityPlugin(env.VITE_API_BASE_URL)] : []),
    ],
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
