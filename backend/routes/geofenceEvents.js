const express = require("express");
const router = express.Router();
const GeofenceEvent = require("../models/GeofenceEvent");

/**
 * GET /api/geofenceEvents
 * Purpose: Retrieve geofence events based on query parameters.
 * Query Parameters:
 * - vehicleId: Filter by vehicle ID.
 * - tripId: Filter by trip ID.
 * - eventType: Filter by event type (e.g., Pickup Arrived, Trip Completed).
 * - from: Start date for filtering events.
 * - to: End date for filtering events.
 */
router.get("/", async (req, res) => {
  try {
    const { vehicleId, tripId, eventType, from, to } = req.query;
    const filter = {};

    // Apply filters based on query parameters
    if (vehicleId) filter.vehicleId = vehicleId;
    if (tripId) filter.tripId = tripId;
    if (eventType) filter.eventType = eventType;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    // Retrieve events from the database
    const events = await GeofenceEvent.find(filter)
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();
    res.json(events);
  } catch (err) {
    console.error("Error retrieving geofence events:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
