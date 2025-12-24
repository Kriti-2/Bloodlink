
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const donorRoutes = require("./routes/donorRoutes");
const requestRoutes = require("./routes/requestRoutes");

const bcrypt = require("bcryptjs");
const User = require("./models/User");

const PORT = process.env.PORT || 5000;
const MONGO = process.env.MONGODB_URI || process.env.MONGODB || "";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// If you later build a static frontend and want to serve it from the server, un-comment:
// app.use(express.static(path.join(__dirname, "../client/dist")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/requests", requestRoutes);

// Health-check
app.get("/healthz", (req, res) => res.json({ ok: true }));

/**
 * Ensure a default admin user exists.
 * Creates user with email process.env.DEFAULT_ADMIN_EMAIL (fallback admin@gmail.com)
 * and password process.env.DEFAULT_ADMIN_PASSWORD (fallback admin123) only if missing.
 */
async function ensureAdminUser() {
  try {
    const defaultEmail = (process.env.DEFAULT_ADMIN_EMAIL || "admin@gmail.com").toLowerCase();
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

    const existing = await User.findOne({ email: defaultEmail });
    if (existing) {
      console.log("✔ Admin user already exists");
      return;
    }

    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await User.create({
      name: "Admin",
      email: defaultEmail,
      passwordHash,
      role: "admin",
    });

    console.log(`⭐ Admin user auto-created: ${defaultEmail} / ${defaultPassword}`);
    console.log("   (Change DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD in .env for production)");
  } catch (err) {
    console.error("❌ Error ensuring admin user:", err);
  }
}

async function start() {
  if (!MONGO) {
    console.error("⚠️ No MongoDB connection string found in environment (MONGODB_URI / MONGODB).");
    console.error("Please set MONGODB_URI in your .env and restart.");
    process.exit(1);
  }

  try {
    // Connect to MongoDB (Mongoose v6+ doesn't need the old options)
    await mongoose.connect(MONGO);
    console.log("✅ MongoDB connected");

    // Ensure admin user exists after DB connection
    await ensureAdminUser();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();
