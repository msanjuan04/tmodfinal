import path from "node:path"

import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiPort = Number(env.PORT ?? "4000") || 4000
  const apiHost = env.API_HOST ?? "localhost"

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        "@app": path.resolve(__dirname, "src"),
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: `http://${apiHost}:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
