require("dotenv").config();
const mongoose = require("mongoose");
const Office = require("../models/Office");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
  await mongoose.connect(MONGODB_URI);
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
  await Vehicle.findOneAndUpdate(
    { vehicleId: "VEH-001" },
    {
      vehicleId: "VEH-001",
      driverName: "Driver One",
      region: "Bangalore",
      officeId: office._id,
      lastLocation: { lat: 12.97, lng: 77.59, speed: 0, timestamp: new Date() },
    },
    { upsert: true },
  );
  await Trip.findOneAndUpdate(
    { tripId: "TRIP-001" },
    {
      tripId: "TRIP-001",
      vehicleId: "VEH-001",
      officeId: office._id,
      region: "Bangalore",
      status: "In Progress",
      startTimestamp: new Date(),
      pickupStops: [
        {
          employeeId: "EMP-1",
          lat: 12.96,
          lng: 77.58,
          radiusMeters: 70,
          status: "pending",
        },
      ],
    },
    { upsert: true },
  );
  console.log(
    "Seed done. Office:",
    office.name,
    "Vehicle: VEH-001, Trip: TRIP-001",
  );
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
