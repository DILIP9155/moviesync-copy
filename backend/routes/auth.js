const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { authMiddleware, JWT_SECRET } = require("../middleware/auth");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Route to handle user signup
router.post(
  "/signup",
  [
    // Validate and sanitize input fields
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("name").trim().notEmpty().withMessage("Name required"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;

      // Check if the email is already registered
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash the password and create a new user
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ email, passwordHash, name });

      // Generate a JWT token for the user
      const token = jwt.sign(
        { userId: user._id.toString(), email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN },
      );

      // Respond with the token and user details
      res.status(201).json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  },
);

// Route to handle user login
router.post(
  "/login",
  [
    // Validate and sanitize input fields
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find the user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      // Compare the provided password with the stored hash
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      // Generate a JWT token for the user
      const token = jwt.sign(
        { userId: user._id.toString(), email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN },
      );

      // Respond with the token and user details
      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  },
);

module.exports = router;
