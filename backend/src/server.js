import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import client from "prom-client";
import { migrate, waitForDb } from "./db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());

// JSON logs (ELK-friendly)
morgan.token("body", (req) => JSON.stringify(req.body || {}));
app.use(
  morgan(
    '{"method":":method","url":":url","status":":status","res_time_ms":":response-time","remote":":remote-addr","body":":body"}'
  )
);

/* ---------- Prometheus metrics ---------- */
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["route", "method", "status"],
});
register.registerMetric(httpRequests);

// Count every request by route/method/status
app.use((req, res, next) => {
  res.on("finish", () => {
    httpRequests.inc({
      route: req.path,
      method: req.method,
      status: res.statusCode,
    });
  });
  next();
});

/* ---------- Health & Metrics ---------- */
app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

/* ---------- API: Inspections CRUD ---------- */
// NOTE: DB uses migrations to create the table on startup (see db.js)

import { pool } from "./db.js";

app.get("/api/inspections", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM inspections ORDER BY id DESC"
    );
    res.json(rows);
  } catch (e) {
    console.error("List inspections error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/inspections", async (req, res) => {
  try {
    const { site, inspection_date, findings } = req.body || {};
    if (!site || !inspection_date || !findings) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const { rows } = await pool.query(
      "INSERT INTO inspections(site, inspection_date, findings) VALUES ($1,$2,$3) RETURNING *",
      [site, inspection_date, findings]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error("Create inspection error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/inspections/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ["Draft", "UnderReview", "Approved"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const { rows } = await pool.query(
      "UPDATE inspections SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [status, id]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("Update status error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ---------- Startup (wait for DB, migrate, listen) ---------- */
async function start() {
  try {
    await waitForDb(30, 1000); // up to ~30s
    await migrate();
    app.listen(port, () => {
      console.log(`API listening on :${port}`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}
start();

/* ---------- Graceful shutdown ---------- */
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down…");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down…");
  process.exit(0);
});

