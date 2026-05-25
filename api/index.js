// api/index.js
// Single Vercel serverless function — wraps entire Express API
// This keeps us within Vercel Hobby's 12-function limit.

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { config } from "dotenv";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

let _app = null;

async function buildApp() {
  if (_app) return _app;

  const app = express();
  app.use(express.json({ limit: "4mb" }));

  // Recursively register all api/**/*.js except this file
  async function registerRoutes(dir, basePath = "/api") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await registerRoutes(fullPath, `${basePath}/${entry.name}`);
      } else if (entry.name.endsWith(".js") && entry.name !== "index.js") {
        const routePath = `${basePath}/${entry.name.replace(".js", "")}`;
        try {
          const mod = await import(pathToFileURL(fullPath).href);
          if (mod.default) {
            app.all(routePath, async (req, res) => {
              try {
                await mod.default(req, res);
              } catch (err) {
                if (!res.headersSent) res.status(500).json({ error: err.message });
              }
            });
          }
        } catch (_) {}
      }
    }
  }

  await registerRoutes(__dirname);
  _app = app;
  return app;
}

export default async function handler(req, res) {
  const app = await buildApp();
  return app(req, res);
}
