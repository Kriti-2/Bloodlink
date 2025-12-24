// server/middleware/requireAdmin.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // optional: check role if you store it in the token
    if (payload.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.user = payload;
    return next();
  } catch (err) {
    // Handle expected verify errors explicitly
    if (err.name === "TokenExpiredError") {
      // don't print stack - respond to client
      console.warn("JWT verify: token expired");
      return res.status(401).json({ message: "Token expired" });
    }
    if (err.name === "JsonWebTokenError") {
      console.warn("JWT verify: invalid token");
      return res.status(401).json({ message: "Invalid token" });
    }
    console.error("Unexpected JWT error:", err);
    return res.status(401).json({ message: "Authentication error" });
  }
}

module.exports = requireAdmin;
