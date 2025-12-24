const mongoose = require("mongoose");

const donorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    city: { type: String, required: true },
    area: { type: String },
    bloodGroup: { type: String, required: true },
    availability: { type: Boolean, default: true },
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
    },
    reportUrl: { type: String }, // future file upload
  },
  { timestamps: true }
);

module.exports = mongoose.model("Donor", donorSchema);
