const mongoose = require("mongoose");

// Define the schema for geofence events
const geofenceEventSchema = new mongoose.Schema(
  {
    // ID of the vehicle associated with the event
    vehicleId: { type: String, required: true },
    // ID of the trip associated with the event
    tripId: { type: String, required: true },
    // Type of geofence event (e.g., Pickup Arrived, Trip Completed)
    eventType: {
      type: String,
      enum: [
        "Pickup Arrived",
        "Office Reached",
        "Trip Completed",
        "Geofence Exit",
        "Trip Started",
      ],
      required: true,
    },
    // Location details of the event
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    // Timestamp of the event
    timestamp: { type: Date, default: Date.now },
    // Additional metadata for the event
    metadata: {
      geofenceId: String, // ID of the geofence
      geofenceType: String, // Type of the geofence (e.g., circle, polygon)
      speed: Number, // Speed of the vehicle at the time of the event
      dwellTimeSeconds: Number, // Time spent in the geofence
    },
  },
  { timestamps: true },
); // Automatically adds createdAt and updatedAt fields

// Add indexes for efficient querying
geofenceEventSchema.index({ tripId: 1, eventType: 1 });
geofenceEventSchema.index({ vehicleId: 1, timestamp: -1 });

// Export the GeofenceEvent model
module.exports = mongoose.model("GeofenceEvent", geofenceEventSchema);
