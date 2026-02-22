const Trip = require('../models/Trip');
const Office = require('../models/Office');
const GeofenceEvent = require('../models/GeofenceEvent');
const { isInsideOfficeGeofence, isInsidePickupGeofence } = require('../utils/geofence');

const MIN_DWELL_SECONDS = parseInt(process.env.GEOFENCE_MIN_DWELL_SECONDS, 10) || 30;
const OFFICE_SPEED_THRESHOLD = parseInt(process.env.OFFICE_SPEED_THRESHOLD_KMH, 10) || 10;

const tripDwellState = new Map(); // tripId -> { officeEnteredAt, pickupIndexEnteredAt }

async function processLocation(vehicleId, tripId, lat, lng, speed, timestamp) {
  const trip = await Trip.findOne({ tripId, status: { $in: ['Started', 'In Progress'] } });
  if (!trip) return { events: [] };

  const office = await Office.findById(trip.officeId);
  if (!office) return { events: [] };

  const events = [];

  // 1. Pickup geofence check
  for (let i = 0; i < trip.pickupStops.length; i++) {
    const stop = trip.pickupStops[i];
    if (stop.status !== 'pending') continue;
    const inside = isInsidePickupGeofence(lat, lng, stop.lat, stop.lng, stop.radiusMeters || 70);
    const key = `pickup_${tripId}_${i}`;
    let state = tripDwellState.get(key);
    if (inside) {
      if (!state) {
        tripDwellState.set(key, { enteredAt: timestamp });
        state = tripDwellState.get(key);
      }
      const dwellSec = (Date.now() - new Date(state.enteredAt).getTime()) / 1000;
      if (dwellSec >= MIN_DWELL_SECONDS) {
        const existing = await GeofenceEvent.findOne({ tripId, eventType: 'Pickup Arrived', 'metadata.geofenceId': `pickup_${i}` });
        if (!existing) {
          await GeofenceEvent.create({
            vehicleId,
            tripId,
            eventType: 'Pickup Arrived',
            latitude: lat,
            longitude: lng,
            timestamp,
            metadata: { geofenceId: `pickup_${i}`, geofenceType: 'pickup', speed, dwellTimeSeconds: dwellSec }
          });
          stop.arrivedAt = new Date();
          stop.status = 'arrived';
          await trip.save();
          events.push({ type: 'Pickup Arrived', stopIndex: i, tripId, vehicleId });
        }
        tripDwellState.delete(key);
      }
    } else {
      tripDwellState.delete(key);
    }
  }

  // 2. Office geofence check
  const insideOffice = isInsideOfficeGeofence(lat, lng, office.latitude, office.longitude, office.radiusMeters || 100);
  const officeKey = `office_${tripId}`;
  let officeState = tripDwellState.get(officeKey);
  if (insideOffice) {
    if (!officeState) {
      tripDwellState.set(officeKey, { enteredAt: timestamp });
      officeState = tripDwellState.get(officeKey);
    }
    const dwellSec = (Date.now() - new Date(officeState.enteredAt).getTime()) / 1000;
    if (dwellSec >= MIN_DWELL_SECONDS && speed <= OFFICE_SPEED_THRESHOLD) {
      const existing = await GeofenceEvent.findOne({ tripId, eventType: 'Trip Completed' });
      if (!existing) {
        await GeofenceEvent.create({
          vehicleId,
          tripId,
          eventType: 'Trip Completed',
          latitude: lat,
          longitude: lng,
          timestamp,
          metadata: { geofenceId: 'office', geofenceType: 'office', speed, dwellTimeSeconds: dwellSec }
        });
        trip.status = 'Completed';
        await trip.save();
        events.push({ type: 'Trip Completed', tripId, vehicleId });
      }
      tripDwellState.delete(officeKey);
    }
  } else {
    tripDwellState.delete(officeKey);
  }

  return { events };
}

module.exports = { processLocation };
