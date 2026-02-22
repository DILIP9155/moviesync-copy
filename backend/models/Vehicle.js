const mongoose = require("mongoose");

// Define the schema for vehicles
const vehicleSchema = new mongoose.Schema(
  {
    // Unique identifier for the vehicle
    vehicleId: { type: String, required: true, unique: true },
    // Driver details
    driverId: String, // Optional driver ID
    driverName: String, // Optional driver name
    // Region where the vehicle operates
    region: String,
    // Reference to the associated office
    officeId: { type: mongoose.Schema.Types.ObjectId, ref: "Office" },
    // Indicates if the vehicle is currently active
    isActive: { type: Boolean, default: true },
    // Last known location of the vehicle
    lastLocation: {
      lat: Number, // Latitude
      lng: Number, // Longitude
      speed: Number, // Speed in km/h
      timestamp: Date, // Timestamp of the last update
    },
  },
  { timestamps: true },
); // Automatically adds createdAt and updatedAt fields

// Export the Vehicle model
module.exports = mongoose.model("Vehicle", vehicleSchema);
