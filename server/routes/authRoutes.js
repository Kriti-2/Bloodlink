// server/routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Use env secret or a dev fallback
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/**
 * Helper - shared login handler
 * Accepts req.body.email & req.body.password
 * Only allows users with role = 'admin'
 */
async function handleAdminLogin(req, res) {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    email = email.toLowerCase().trim();

    // Only allow users with role = 'admin'
    const user = await User.findOne({ email, role: "admin" });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare using the stored passwordHash field
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/auth/register
 * For now: create an ADMIN user.
 * (In real production you would remove or protect this route!)
 */
router.post("/register", async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    email = email.toLowerCase().trim();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "admin", // 👈 this user will be an ADMIN
    });

    res.status(201).json({
      message: "Admin user created",
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Login endpoints
 *
 * Keep the existing /admin/login path for clarity,
 * and also accept /login because your frontend uses /api/auth/login
 */
router.post("/admin/login", handleAdminLogin);
router.post("/login", handleAdminLogin);

module.exports = router;
