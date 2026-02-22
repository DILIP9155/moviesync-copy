const mongoose = require("mongoose");

// Define the schema for trips
const tripSchema = new mongoose.Schema(
  {
    // Unique identifier for the trip
    tripId: { type: String, required: true, unique: true },
    // ID of the vehicle associated with the trip
    vehicleId: { type: String, required: true },
    // Reference to the associated office
    officeId: { type: mongoose.Schema.Types.ObjectId, ref: "Office" },
    // Route details
    routeId: String, // Optional route ID
    region: String, // Region where the trip is taking place
    // Status of the trip
    status: {
      type: String,
      enum: ["Scheduled", "Started", "In Progress", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    // Timestamps for the trip
    startTimestamp: Date, // Start time of the trip
    endTimestamp: Date, // End time of the trip
    // Geographical coordinates for the trip
    startLat: Number, // Starting latitude
    startLng: Number, // Starting longitude
    endLat: Number, // Ending latitude
    endLng: Number, // Ending longitude
    // Trip metrics
    totalDistanceKm: Number, // Total distance covered in kilometers
    durationMinutes: Number, // Duration of the trip in minutes
    // Pickup stops along the trip
    pickupStops: [
      {
        employeeId: String, // ID of the employee to be picked up
        lat: Number, // Latitude of the pickup location
        lng: Number, // Longitude of the pickup location
        radiusMeters: { type: Number, default: 70 }, // Radius of the pickup geofence
        arrivedAt: Date, // Time when the vehicle arrived at the pickup location
        droppedAt: Date, // Time when the employee was dropped off
        status: {
          type: String,
          enum: ["pending", "arrived", "picked", "dropped"],
          default: "pending",
        }, // Status of the pickup
      },
    ],
    // Manual override details
    manualOverride: { type: Boolean, default: false }, // Indicates if the trip was manually overridden
    manualOverrideReason: String, // Reason for the manual override
    manualOverrideAt: Date, // Timestamp of the manual override
  },
  { timestamps: true },
); // Automatically adds createdAt and updatedAt fields

// Export the Trip model
module.exports = mongoose.model("Trip", tripSchema);
