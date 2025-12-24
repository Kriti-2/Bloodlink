const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    requiredBloodGroup: {
      type: String,
      required: true,
    },
    hospitalName: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    urgency: {
      type: String,
      enum: ["normal", "urgent", "critical"],
      default: "normal",
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },

    // ✅ NEW: which donors we “notified”
    notifiedDonors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Donor",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
