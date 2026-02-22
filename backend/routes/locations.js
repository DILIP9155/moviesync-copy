const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");
const { processLocation } = require("../services/geofenceEngine");
const {
  sendPickupArrivalNotification,
} = require("../services/notificationService");

/**
 * POST /api/locations/stream
 * Purpose: Handle real-time vehicle location streaming.
 * Body Parameters:
 * - vehicleId: ID of the vehicle (required).
 * - tripId: ID of the trip (required).
 * - latitude: Latitude of the vehicle (required).
 * - longitude: Longitude of the vehicle (required).
 * - speed: Speed of the vehicle (optional, in km/h).
 * - timestamp: Timestamp of the location update (optional, defaults to now).
 *
 * Recommended: Push updates every 5-10 seconds.
 * Response: { success, events } and broadcasts location updates via Socket.io.
 */
router.post("/stream", async (req, res) => {
  try {
    const { vehicleId, tripId, latitude, longitude, speed, timestamp } =
      req.body;

    // Validate required fields
    if (!vehicleId || !tripId || latitude == null || longitude == null) {
      return res.status(400).json({
        error: "vehicleId, tripId, latitude, longitude required",
        expected: {
          vehicleId: "string",
          tripId: "string",
          latitude: "number",
          longitude: "number",
          speed: "number (optional)",
          timestamp: "ISO or ms (optional)",
        },
      });
    }

    const ts = timestamp ? new Date(timestamp) : new Date();

    // Update the vehicle's last known location
    await Vehicle.findOneAndUpdate(
      { vehicleId },
      {
        $set: {
          lastLocation: {
            lat: latitude,
            lng: longitude,
            speed: speed || 0,
            timestamp: ts,
          },
        },
      },
      { upsert: true },
    );

    // Process the location update and generate events
    const { events } = await processLocation(
      vehicleId,
      tripId,
      latitude,
      longitude,
      speed || 0,
      ts,
    );

    // Handle specific events (e.g., Pickup Arrived)
    for (const ev of events) {
      if (ev.type === "Pickup Arrived") {
        await sendPickupArrivalNotification(
          ev.tripId,
          ev.vehicleId,
          ev.stopIndex,
        );
      }
    }

    res.json({ success: true, events });
  } catch (err) {
    console.error("Error processing location stream:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
