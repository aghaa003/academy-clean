import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";

import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

/**
 * Logger Middleware
 */
app.use(
  pinoHttp({
    logger,

    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },

      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

/**
 * CORS
 */
app.use(
  cors({
    credentials: true,
    origin: true,
  }),
);

/**
 * Cookie Parser
 */
app.use(
  cookieParser(
    process.env.SESSION_SECRET ?? "dev-secret-academy-2025",
  ),
);

/**
 * Body Parsers
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Static Uploads
 * Files will be accessible from:
 * /api/uploads/<filename>
 */
app.use(
  "/api/uploads",
  express.static(path.resolve(__dirname, "../../uploads")),
);

/**
 * API Routes
 */
app.use("/api", router);

/**
 * Optional Health Check
 */
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "API Server Running 🚀",
  });
});

export default app;