const mongoose = require("mongoose");

// Define the schema for users
const userSchema = new mongoose.Schema(
  {
    // Email address of the user (unique and required)
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Hashed password for authentication
    passwordHash: { type: String, required: true },
    // Name of the user
    name: { type: String, required: true, trim: true },
    // Role of the user (e.g., admin, ops, viewer)
    role: { type: String, enum: ["admin", "ops", "viewer"], default: "viewer" },
    // Indicates if the user account is active
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
); // Automatically adds createdAt and updatedAt fields

// Export the User model
module.exports = mongoose.model("User", userSchema);
