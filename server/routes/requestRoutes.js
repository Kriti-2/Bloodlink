// server/routes/requestRoutes.js
const express = require("express");
const Request = require("../models/Request");
const Donor = require("../models/Donor");
const twilio = require("twilio");
const requireAdmin = require("../middleware/auth"); // ✅ no { }

const router = express.Router();

/* ---------- CREATE REQUEST (public) ---------- */
router.post("/", async (req, res) => {
  try {
    const {
      requiredBloodGroup,
      hospitalName,
      city,
      contactNumber,
      urgency,
    } = req.body;

    if (!requiredBloodGroup || !hospitalName || !city || !contactNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 1. Save request
    const requestDoc = await Request.create({
      requiredBloodGroup,
      hospitalName,
      city,
      contactNumber,
      urgency: urgency || "normal",
    });

    // 2. Match donors
    const trimmedCity = city.trim();

    const donorFilter = {
      bloodGroup: requiredBloodGroup,
      availability: true,
      verificationStatus: "verified",
      phone: { $exists: true, $ne: "" },
    };

    if (trimmedCity) {
      donorFilter.city = new RegExp(`^${trimmedCity}$`, "i");
    }

    console.log("🔍 Matching donors with filter:", donorFilter);

    const matchingDonors = await Donor.find(donorFilter);
    console.log(
      `✅ Found ${matchingDonors.length} matching donors for new request`
    );

    // 3. Try sending SMS via Twilio
    let notifiedCount = 0;

    const { TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE } = process.env;
    let twilioClient = null;

    if (TWILIO_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE) {
      twilioClient = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);
    }

    if (twilioClient && matchingDonors.length > 0) {
      const smsPromises = matchingDonors.map((donor) => {
        const donorPhone = donor.phone;
        if (!donorPhone) return null;

        const messageBody = `Emergency ${requiredBloodGroup} request at ${hospitalName}, ${city}. Contact: ${contactNumber}. Urgency: ${
          urgency || "normal"
        }`;

        return twilioClient.messages
          .create({
            from: TWILIO_PHONE,
            to: donorPhone,
            body: messageBody,
          })
          .then(() => {
            console.log("📨 SMS sent to donor:", donor.name, donorPhone);
            notifiedCount++;
          })
          .catch((err) => {
            console.error("❌ Error sending SMS to", donorPhone, err.message);
          });
      });

      await Promise.all(smsPromises.filter(Boolean));
    } else {
      console.log(
        "ℹ️ Twilio not configured or no donors matched. Skipping SMS sending."
      );
    }

    // 4. Respond to client
    res.status(201).json({
      request: requestDoc,
      notifiedCount,
      matches: matchingDonors,
      message:
        notifiedCount > 0
          ? `Request created and ${notifiedCount} donors notified via SMS.`
          : "Request created. No matching donors right now, but your request is visible in the network.",
    });
  } catch (err) {
    console.error("Error creating request:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------- LIST REQUESTS (admin-only) ---------- */
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { status: status || "open" };

    const requests = await Request.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error("Error fetching requests:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------- GET SINGLE REQUEST (admin-only) ---------- */
router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const requestDoc = await Request.findById(req.params.id);
    if (!requestDoc) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json(requestDoc);
  } catch (err) {
    console.error("Error fetching request:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------- CLOSE REQUEST (admin-only) ---------- */
router.patch("/:id/close", requireAdmin, async (req, res) => {
  try {
    const requestDoc = await Request.findByIdAndUpdate(
      req.params.id,
      { status: "closed" },
      { new: true }
    );

    if (!requestDoc) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json(requestDoc);
  } catch (err) {
    console.error("Error closing request:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
