import type { Express } from "express";
import { generateOpenAPISpec } from "./docs/openapi";

export function registerDocsRoutes(app: Express): void {
  app.get("/api/docs/openapi.json", (_req, res) => {
    res.json(generateOpenAPISpec());
  });
}
