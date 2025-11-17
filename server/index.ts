import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import morgan from "morgan"
import path from "node:path"

import { env } from "./config/env"
import { authRouter } from "./routes/auth"
import { clientRouter } from "./routes/client"
import { adminRouter } from "./routes/admin"
import { webhooksRouter } from "./routes/webhooks"

const app = express()
const MAX_PAYLOAD_SIZE = "150mb"

const allowedOrigins = new Set([env.clientAppOrigin])

if (env.nodeEnv !== "production") {
  allowedOrigins.add("http://localhost:5173")
  allowedOrigins.add("http://127.0.0.1:5173")
  allowedOrigins.add("http://localhost:4173")
  allowedOrigins.add("http://127.0.0.1:4173")
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`Origin "${origin}" not allowed by CORS`))
    },
    credentials: true,
  }),
)
app.use(cookieParser())
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"))

// Webhook endpoint debe recibir el body raw (sin parsear JSON)
app.use("/api/webhooks", express.raw({ type: "application/json" }), webhooksRouter)

// Resto de endpoints usan JSON parsing
app.use(express.json({ limit: MAX_PAYLOAD_SIZE }))
app.use(express.urlencoded({ limit: MAX_PAYLOAD_SIZE, extended: true }))

app.use("/api/auth", authRouter)
app.use("/api/client", clientRouter)
app.use("/api/admin", adminRouter)

// En producción, servir archivos estáticos del frontend
if (env.nodeEnv === "production") {
  const distPath = path.resolve(process.cwd(), "dist")
  app.use(express.static(distPath))
  
  // Todas las rutas que no sean /api/* sirven el index.html (SPA routing)
  // Esto debe ir ANTES del error handler
  app.get("*", (request, response, next) => {
    // No servir index.html para rutas de API
    if (request.path.startsWith("/api")) {
      return next()
    }
    response.sendFile(path.join(distPath, "index.html"))
  })
}

// Error handler debe ir al final
app.use((error: Error & { status?: number }, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const status = error.status ?? 500
  if (status >= 500) {
    console.error(error)
  }
  response.status(status).json({
    message: error.message ?? "Internal Server Error",
  })
})

app.listen(env.port, () => {
  console.log(`Terrazea API escuchando en http://localhost:${env.port}`)
  if (env.nodeEnv === "production") {
    console.log(`Frontend estático servido desde: ${path.resolve(process.cwd(), "dist")}`)
  }
})
