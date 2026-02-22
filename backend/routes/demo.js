const express = require("express");
const router = express.Router();
const Office = require("../models/Office");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");

/**
 * POST /api/demo/seed
 * Purpose: Seeds the database with sample data for demonstration purposes.
 * - Creates a sample office.
 * - Creates 5 vehicles with varied positions across Bangalore.
 * - Creates 5 in-progress trips associated with the vehicles.
 */
router.post("/seed", async (req, res) => {
  try {
    // Create or update a single office as the destination
    const office = await Office.findOneAndUpdate(
      { name: "Moveinsync HQ" },
      {
        name: "Moveinsync HQ",
        region: "Bangalore",
        latitude: 12.9716,
        longitude: 77.5946,
        geofenceRadiusMeters: 200,
        speedThresholdKmh: 10,
        minTripDurationMinutes: 5,
      },
      { upsert: true, new: true },
    );

    // Define a fleet of 5 vehicles scattered around Bangalore
    const fleet = [
      {
        vehicleId: "VEH-001",
        driverName: "Ramesh Kumar",
        startLat: 12.96,
        startLng: 77.58,
        pickupLat: 12.955,
        pickupLng: 77.575,
        empId: "EMP-101",
      },
      {
        vehicleId: "VEH-002",
        driverName: "Suresh Patel",
        startLat: 12.99,
        startLng: 77.61,
        pickupLat: 12.985,
        pickupLng: 77.605,
        empId: "EMP-102",
      },
      {
        vehicleId: "VEH-003",
        driverName: "Anjali Singh",
        startLat: 12.95,
        startLng: 77.62,
        pickupLat: 12.945,
        pickupLng: 77.615,
        empId: "EMP-103",
      },
      {
        vehicleId: "VEH-004",
        driverName: "Vikram Das",
        startLat: 12.98,
        startLng: 77.57,
        pickupLat: 12.975,
        pickupLng: 77.565,
        empId: "EMP-104",
      },
      {
        vehicleId: "VEH-005",
        driverName: "Priya Nair",
        startLat: 13.0,
        startLng: 77.59,
        pickupLat: 12.995,
        pickupLng: 77.585,
        empId: "EMP-105",
      },
    ];

    // Create vehicles and trips for the fleet
    for (const vehicle of fleet) {
      const createdVehicle = await Vehicle.findOneAndUpdate(
        { vehicleId: vehicle.vehicleId },
        {
          vehicleId: vehicle.vehicleId,
          driverName: vehicle.driverName,
          region: "Bangalore",
          lastLocation: {
            lat: vehicle.startLat,
            lng: vehicle.startLng,
            speed: 0,
            timestamp: new Date(),
          },
        },
        { upsert: true, new: true },
      );

      await Trip.create({
        tripId: `TRIP-${vehicle.vehicleId}`,
        vehicleId: createdVehicle.vehicleId,
        officeId: office._id,
        region: "Bangalore",
        status: "In Progress",
        startTimestamp: new Date(),
        startLat: vehicle.startLat,
        startLng: vehicle.startLng,
        endLat: office.latitude,
        endLng: office.longitude,
        pickupStops: [
          {
            employeeId: vehicle.empId,
            lat: vehicle.pickupLat,
            lng: vehicle.pickupLng,
            status: "pending",
          },
        ],
      });
    }

    res.json({ success: true, message: "Demo data seeded successfully" });
  } catch (err) {
    console.error("Error seeding demo data:", err);
    res.status(500).json({ error: "Failed to seed demo data" });
  }
});

module.exports = router;
