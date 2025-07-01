import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Routes
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin.routes.js";

// Register routes with appropriate prefixes
app.use("/api/v1", userRoutes); // All public and user-authenticated routes
app.use("/api/v1/admin", adminRoutes); // All admin routes (requires admin privileges)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res
    .status(500)
    .json({ message: "Internal server error", error: err.message });
});

export default app;
