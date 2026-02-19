import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./lib/config.js";
import { authRequired } from "./lib/auth.js";
import { initDb } from "./lib/db.js";

import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import messageRoutes from "./routes/messages.js";
import taskRoutes from "./routes/tasks.js";
import documentRoutes from "./routes/documents.js";
import notificationRoutes from "./routes/notifications.js";
import auditRoutes from "./routes/audits.js";
import uploadRoutes from "./routes/uploads.js";
import dashboardRoutes from "./routes/dashboard.js";
import reviewRoutes from "./routes/reviews.js";
import requestRoutes from "./routes/requests.js";
import profileRoutes from "./routes/profile.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendOrigin === "*" ? true : config.frontendOrigin }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "secure-client-portal-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/clients", authRequired, clientRoutes);
app.use("/api/messages", authRequired, messageRoutes);
app.use("/api/tasks", authRequired, taskRoutes);
app.use("/api/documents", authRequired, documentRoutes);
app.use("/api/dashboard", authRequired, dashboardRoutes);
app.use("/api/reviews", authRequired, reviewRoutes);
app.use("/api/requests", authRequired, requestRoutes);
app.use("/api/profile", authRequired, profileRoutes);
app.use("/api/notifications", authRequired, notificationRoutes);
app.use("/api/audits", authRequired, auditRoutes);
app.use("/api/uploads", authRequired, uploadRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Internal server error", details: error.message });
});

async function startServer() {
  await initDb();

  app.listen(config.port, () => {
    console.log(`Backend running at http://localhost:${config.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
