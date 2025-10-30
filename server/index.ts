import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import morgan from "morgan"

import { env } from "./config/env"
import { authRouter } from "./routes/auth"
import { clientRouter } from "./routes/client"
import { adminRouter } from "./routes/admin"

const app = express()

const allowedOrigins = new Set([env.clientAppUrl])

if (env.nodeEnv !== "production") {
  allowedOrigins.add("http://localhost:5173")
  allowedOrigins.add("http://127.0.0.1:5173")
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
app.use(express.json())
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"))

app.use("/api/auth", authRouter)
app.use("/api/client", clientRouter)
app.use("/api/admin", adminRouter)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
})
