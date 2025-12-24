// server/routes/donorRoutes.js
const express = require("express");
const Donor = require("../models/Donor");

const router = express.Router();

/**
 * Try to load admin middleware safely.
 * The middleware file may export a function directly:
 *    module.exports = requireAdmin
 * or an object with a named export:
 *    module.exports = { requireAdmin }
 *
 * We detect both and expose a safe adminGuard middleware so the routes
 * won't crash if the auth middleware isn't present or is mis-exported.
 */
let requireAdminFn = null;
try {
  const authModule = require("../middleware/auth");
  if (typeof authModule === "function") {
    requireAdminFn = authModule;
  } else if (authModule && typeof authModule.requireAdmin === "function") {
    requireAdminFn = authModule.requireAdmin;
  } else {
    console.warn(
      "[donorRoutes] middleware/auth found but does not export a function. Admin endpoints will return 501 until auth is configured."
    );
  }
} catch (err) {
  // middleware/auth may not exist yet (that's OK during development)
  console.warn(
    "[donorRoutes] middleware/auth not found. Admin endpoints will return 501 until auth is configured."
  );
}

/**
 * adminGuard: calls the real requireAdmin if available,
 * otherwise returns a 501 response (Not Implemented).
 */
function adminGuard(req, res, next) {
  if (requireAdminFn) {
    try {
      return requireAdminFn(req, res, next);
    } catch (err) {
      console.error("[donorRoutes] error in requireAdmin middleware:", err);
      return res.status(500).json({ message: "Auth middleware error" });
    }
  }
  return res
    .status(501)
    .json({ message: "Admin auth not configured on server (501)." });
}

/**
 * POST /api/donors
 * Public: register a new donor
 */
router.post("/", async (req, res) => {
  try {
    const { name, phone, city, area, bloodGroup } = req.body;

    if (!name || !phone || !city || !bloodGroup) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const donor = await Donor.create({
      name,
      phone,
      city,
      area,
      bloodGroup,
      availability: true,
      verificationStatus: "unverified",
    });

    res.status(201).json(donor);
  } catch (err) {
    console.error("Error creating donor:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/donors
 * Public: search donors (used by "Find Donor" and matching logic)
 * Query params: bloodGroup, city, onlyVerified=true
 */
router.get("/", async (req, res) => {
  try {
    const { bloodGroup, city, onlyVerified } = req.query;

    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (city) filter.city = city;
    if (onlyVerified === "true") filter.verificationStatus = "verified";

    const donors = await Donor.find(filter).sort({ createdAt: -1 });
    res.json(donors);
  } catch (err) {
    console.error("Error fetching donors:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/donors/admin
 * Admin-only: view ALL donors (for Admin panel)
 */
router.get("/admin", adminGuard, async (req, res) => {
  try {
    const donors = await Donor.find({}).sort({ createdAt: -1 });
    res.json(donors);
  } catch (err) {
    console.error("Error fetching all donors for admin:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/donors/:id/verify
 * Admin-only: mark donor as verified
 */
router.patch("/:id/verify", adminGuard, async (req, res) => {
  try {
    const donor = await Donor.findByIdAndUpdate(
      req.params.id,
      { verificationStatus: "verified" },
      { new: true }
    );

    if (!donor) {
      return res.status(404).json({ message: "Donor not found" });
    }

    res.json(donor);
  } catch (err) {
    console.error("Error verifying donor:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/donors/:id/availability
 * Admin-only: toggle availability
 */
router.patch("/:id/availability", adminGuard, async (req, res) => {
  try {
    const { availability } = req.body;

    const donor = await Donor.findByIdAndUpdate(
      req.params.id,
      { availability },
      { new: true }
    );

    if (!donor) {
      return res.status(404).json({ message: "Donor not found" });
    }

    res.json(donor);
  } catch (err) {
    console.error("Error updating availability:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
