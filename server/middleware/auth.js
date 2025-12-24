// // server/middleware/auth.js
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");

// const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// /**
//  * requireAdmin middleware
//  * - expects Authorization: Bearer <token>
//  * - verifies token, checks role === 'admin'
//  * - handles token expiration gracefully (returns 401)
//  */
// async function requireAdmin(req, res, next) {
//   try {
//     const auth = req.headers.authorization || "";
//     const parts = auth.split(" ");
//     if (parts.length !== 2 || parts[0] !== "Bearer") {
//       return res.status(401).json({ message: "Missing or malformed Authorization header" });
//     }

//     const token = parts[1];

//     let payload;
//     try {
//       payload = jwt.verify(token, JWT_SECRET);
//     } catch (err) {
//       // jwt.verify throws for invalid/expired tokens — handle gracefully
//       if (err.name === "TokenExpiredError") {
//         return res.status(401).json({ message: "Token expired" });
//       }
//       return res.status(401).json({ message: "Invalid token" });
//     }

//     // Optionally: verify user still exists and is admin
//     const user = await User.findById(payload.id).select("-passwordHash");
//     if (!user || user.role !== "admin") {
//       return res.status(403).json({ message: "Admin access required" });
//     }

//     // Attach user to request for handlers to use if needed
//     req.user = user;
//     next();
//   } catch (err) {
//     console.error("[auth middleware] unexpected error:", err);
//     return res.status(500).json({ message: "Auth middleware error" });
//   }
// }

// // Export the middleware as named and default to be tolerant of different import styles
// module.exports = {
//   requireAdmin,
//   default: requireAdmin,
// };

// // also assign for direct function import compatibility
// function requireAdminWrapper(req, res, next) {
//   return requireAdmin(req, res, next);
// }
// module.exports = requireAdminWrapper;
// server/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/**
 * requireAdmin middleware
 * - expects Authorization: Bearer <token>
 * - verifies token, checks role === 'admin'
 * - handles token expiration gracefully (returns 401)
 */
async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ message: "Missing or malformed Authorization header" });
    }

    const token = parts[1];
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Invalid token" });
    }

    // Confirm user still exists and is admin
    const user = await User.findById(payload.id).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    // attach user and continue
    req.user = user;
    next();
  } catch (err) {
    console.error("[auth middleware] unexpected error:", err);
    return res.status(500).json({ message: "Auth middleware error" });
  }
}

// Export both direct function and named property for compatibility
module.exports = requireAdmin;
module.exports.requireAdmin = requireAdmin;
