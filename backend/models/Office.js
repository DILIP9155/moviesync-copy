const mongoose = require("mongoose");

// Define the schema for offices
const officeSchema = new mongoose.Schema(
  {
    // Name of the office
    name: { type: String, required: true },
    // Region where the office is located
    region: String,
    // Geographical coordinates of the office
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    // Geofence details
    geofenceRadiusMeters: { type: Number, default: 200 }, // Radius in meters for circular geofences
    geofenceType: {
      type: String,
      enum: ["circle", "polygon"],
      default: "circle",
    }, // Type of geofence
    polygonCoordinates: [{ lat: Number, lng: Number }], // Coordinates for polygonal geofences
    // Speed threshold for vehicles near the office
    speedThresholdKmh: { type: Number, default: 10 },
    // Minimum trip duration in minutes
    minTripDurationMinutes: { type: Number, default: 5 },
  },
  { timestamps: true },
); // Automatically adds createdAt and updatedAt fields

// Export the Office model
module.exports = mongoose.model("Office", officeSchema);
