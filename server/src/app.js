import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import ruleRoutes from "./routes/ruleRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import sarRoutes from "./routes/sarRoutes.js";
import networkRoutes from "./routes/networkRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";

const app = express();

// ============================================
// CORS CONFIGURATION
// ============================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://aml-transaction-monitoring-1.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without origin
      // (Postman, server-to-server requests, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS policy: Origin ${origin} is not allowed`),
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ============================================
// BODY PARSER MIDDLEWARE
// ============================================

app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

// ============================================
// HTTP REQUEST LOGGER
// ============================================

const morganStream = {
  write: (message) => logger.info(message.trim()),
};

app.use(
  morgan("combined", {
    stream: morganStream,
  }),
);

// ============================================
// HEALTH CHECK
// ============================================

app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;

  const states = ["Disconnected", "Connected", "Connecting", "Disconnecting"];

  res.status(200).json({
    success: true,
    message: "AML Monitoring Platform API is healthy",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(1)}s`,
    database: {
      status: states[dbState] || "Unknown",
      host: mongoose.connection.host || "N/A",
      name: mongoose.connection.name || "N/A",
    },
  });
});

// ============================================
// API INFORMATION
// ============================================

app.get("/api/v1", (req, res) => {
  res.status(200).json({
    success: true,
    name: "AML Transaction Monitoring & Suspicious Activity Detection API",
    version: "1.0.0",
    phase: "Phase 5: Executive Dashboard, Analytics & Reporting Engine",
    endpoints: {
      health: "/api/health",
      auth: "/api/v1/auth",
      transactions: "/api/v1/transactions",
      rules: "/api/v1/rules",
      alerts: "/api/v1/alerts",
      sar: "/api/v1/sar",
      network: "/api/v1/network",
      dashboard: "/api/v1/dashboard",
      reports: "/api/v1/reports",
      customers: "/api/v1/customers",
    },
  });
});

// ============================================
// API ROUTES
// ============================================

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/transactions", transactionRoutes);

app.use("/api/v1/rules", ruleRoutes);

app.use("/api/v1/alerts", alertRoutes);

app.use("/api/v1/sar", sarRoutes);

app.use("/api/v1/network", networkRoutes);

app.use("/api/v1/dashboard", dashboardRoutes);

app.use("/api/v1/reports", reportRoutes);

app.use("/api/v1/customers", customerRoutes);

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route Not Found: ${req.method} ${req.originalUrl}`,
  });
});

// ============================================
// CENTRALIZED ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  logger.error(`Unhandled Error: ${err.message}`, {
    stack: err.stack,
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
