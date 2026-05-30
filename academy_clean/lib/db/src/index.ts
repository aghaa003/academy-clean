import mongoose from "mongoose";

const rawUrl = process.env["MONGODB_URL"] ?? process.env["DATABASE_URL"] ?? "";
const MONGODB_URL = rawUrl.startsWith("mongodb") ? rawUrl : "mongodb://127.0.0.1:27017/academy";

let connectPromise: Promise<void> | null = null;

export function connectDB(): Promise<void> {
  if (connectPromise) return connectPromise;
  connectPromise = mongoose
    .connect(MONGODB_URL)
    .then(() => undefined)
    .catch((err: unknown) => {
      console.error("MongoDB connection failed:", err);
      connectPromise = null;
      throw err;
    });
  return connectPromise;
}

connectDB().catch(() => {});

export * from "./schema";
