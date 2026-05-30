#!/usr/bin/env node
"use strict";

const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Load .env from the artifact directory
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

process.env.NODE_ENV = "development";

const isWin = process.platform === "win32";

const dataDir = path.join(os.tmpdir(), "mongodb-data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const logFile = path.join(os.tmpdir(), "mongodb.log");

const mongodArgs = [
  "--dbpath", dataDir,
  "--port", "27017",
  "--logpath", logFile,
];

if (!isWin) {
  // --fork is not supported on Windows
  mongodArgs.push("--fork");
}

try {
  const mongod = spawn("mongod", mongodArgs, {
    detached: !isWin,
    stdio: "ignore",
    shell: isWin,
  });
  if (!isWin) mongod.unref();
  console.log("MongoDB starting...");
} catch (e) {
  console.warn("Could not auto-start mongod. Make sure MongoDB is running on port 27017.");
}

setTimeout(function () {
  try {
    execSync("pnpm run build", { stdio: "inherit" });
    execSync("pnpm run start", { stdio: "inherit" });
  } catch (e) {
    process.exit(1);
  }
}, 2000);
