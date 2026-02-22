const express = require("express");
const router = express.Router();
const Office = require("../models/Office");

/**
 * GET /api/offices
 * Purpose: Retrieve a list of offices, optionally filtered by region.
 * Query Parameters:
 * - region: Filter offices by region (optional).
 */
router.get("/", async (req, res) => {
  try {
    const { region } = req.query;
    const filter = region ? { region } : {};

    // Retrieve offices from the database
    const offices = await Office.find(filter).lean();
    res.json(offices);
  } catch (err) {
    console.error("Error retrieving offices:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/offices/:id
 * Purpose: Retrieve details of a specific office by its ID.
 */
router.get("/:id", async (req, res) => {
  try {
    const office = await Office.findById(req.params.id).lean();
    if (!office) return res.status(404).json({ error: "Office not found" });
    res.json(office);
  } catch (err) {
    console.error("Error retrieving office:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/offices
 * Purpose: Create a new office.
 * Body Parameters: Office details (name, region, latitude, longitude, etc.).
 */
router.post("/", async (req, res) => {
  try {
    const office = await Office.create(req.body);
    res.status(201).json(office);
  } catch (err) {
    console.error("Error creating office:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/offices/:id
 * Purpose: Update an existing office by its ID.
 * Body Parameters: Updated office details.
 */
router.put("/:id", async (req, res) => {
  try {
    const office = await Office.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).lean();
    if (!office) return res.status(404).json({ error: "Office not found" });
    res.json(office);
  } catch (err) {
    console.error("Error updating office:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
