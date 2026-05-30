import app from "./app";
  import { connectDB } from "@workspace/db";
  import { logger } from "./lib/logger";
  import { seedAdmin } from "./lib/seed";

  const rawPort = process.env["PORT"];

  if (!rawPort) {
    throw new Error("PORT environment variable is required but was not provided.");
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  connectDB()
    .then(() => seedAdmin())
    .catch((err: unknown) => logger.error({ err }, "DB / seed init failed"));

  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });

  server.on("error", (err: Error) => {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  });
  