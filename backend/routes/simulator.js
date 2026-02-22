const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const { processLocation } = require('../services/geofenceEngine');
const { sendPickupArrivalNotification } = require('../services/notificationService');

const activeSimulations = new Map();

/**
 * Builds interpolated movement steps from start → pickup → office
 * Stays at pickup & office for 7 ticks (~35s) to satisfy 30s dwell time
 */
function buildSteps(pickupLat, pickupLng, officeLat, officeLng) {
  const atPickup = { lat: pickupLat, lng: pickupLng, speed: 0 };
  const atOffice = { lat: officeLat, lng: officeLng, speed: 0 };
  return [
    { lat: pickupLat - 0.012, lng: pickupLng + 0.004, speed: 28 },
    { lat: pickupLat - 0.007, lng: pickupLng + 0.002, speed: 20 },
    { lat: pickupLat - 0.003, lng: pickupLng + 0.001, speed: 12 },
    ...Array(7).fill(atPickup),
    { lat: pickupLat + 0.003, lng: pickupLng - 0.001, speed: 15 },
    { lat: pickupLat + 0.008, lng: pickupLng - 0.003, speed: 22 },
    { lat: officeLat - 0.025, lng: officeLng - 0.005, speed: 32 },
    { lat: officeLat - 0.015, lng: officeLng - 0.002, speed: 25 },
    { lat: officeLat - 0.008, lng: officeLng, speed: 18 },
    { lat: officeLat - 0.003, lng: officeLng, speed: 10 },
    ...Array(7).fill(atOffice)
  ];
}

async function runSimulation(tripId, io) {
  const trip = await Trip.findOne({ tripId }).populate('officeId');
  if (!trip) return;
  if (trip.status === 'Completed') return;

  const office = trip.officeId;
  if (!office) return;

  const officeLat = office.latitude;
  const officeLng = office.longitude;
  const pickup = trip.pickupStops && trip.pickupStops[0];
  const pickupLat = pickup ? pickup.lat : officeLat - 0.02;
  const pickupLng = pickup ? pickup.lng : officeLng;
  const vehicleId = trip.vehicleId;

  const intervalMs = parseInt(process.env.LOCATION_STREAM_INTERVAL_MS, 10) || 5000;
  const steps = buildSteps(pickupLat, pickupLng, officeLat, officeLng);
  let step = 0;
  const maxTicks = steps.length + 3;

  const id = setInterval(async () => {
    const s = steps[Math.min(step, steps.length - 1)];
    const ts = new Date();
    try {
      await Vehicle.findOneAndUpdate(
        { vehicleId },
        { $set: { lastLocation: { lat: s.lat, lng: s.lng, speed: s.speed, timestamp: ts } } },
        { upsert: true }
      );
      const { events } = await processLocation(vehicleId, tripId, s.lat, s.lng, s.speed, ts);
      for (const ev of events) {
        if (ev.type === 'Pickup Arrived') {
          await sendPickupArrivalNotification(ev.tripId, ev.vehicleId, ev.stopIndex);
        }
      }
      if (io) {
        io.emit('location:update', {
          vehicleId, tripId,
          latitude: s.lat, longitude: s.lng,
          speed: s.speed, timestamp: ts.toISOString()
        });
        events.forEach((ev) => io.emit('geofence:event', ev));

        // Broadcast live stats after every location tick
        broadcastStats(io);
      }
    } catch (e) {
      console.error('Simulator tick error:', e.message);
    }
    step++;
    if (step >= maxTicks) {
      clearInterval(id);
      activeSimulations.delete(tripId);
      try {
        const t = await Trip.findOne({ tripId });
        if (t && t.status !== 'Completed') {
          t.status = 'Completed';
          t.endTimestamp = new Date();
          await t.save();
          if (io) {
            io.emit('trip:updated', { tripId: t.tripId, status: t.status });
            broadcastStats(io);
          }
        }
      } catch (e) {
        console.error('Sim finalize error:', e.message);
      }
    }
  }, intervalMs);

  activeSimulations.set(tripId, id);
}

async function broadcastStats(io) {
  try {
    const active = await Trip.find({ status: { $in: ['Started', 'In Progress'] } }).lean();
    const completed = await Trip.countDocuments({ status: 'Completed' });
    // Count vehicles near pickup: trips that have any stop with status 'arrived'
    const nearPickup = active.filter(t => t.pickupStops?.some(s => s.status === 'pending')).length;
    const atOffice = active.filter(t => {
      // No stops or all arrived = heading to office
      return t.pickupStops?.every(s => s.status !== 'pending');
    }).length;
    const delayed = active.filter(t => {
      const startMs = t.startTimestamp ? new Date(t.startTimestamp).getTime() : 0;
      return startMs > 0 && (Date.now() - startMs) > 60 * 60 * 1000; // delayed > 1hr
    }).length;

    io.emit('stats:update', {
      ongoing: active.length,
      delayed,
      inOffice: atOffice,
      nearPickup,
      totalCompleted: completed,
      activeVehicles: activeSimulations.size
    });
  } catch (e) {
    console.error('Stats broadcast error:', e.message);
  }
}



/** POST /api/simulator/start — single trip */
router.post('/start', async (req, res) => {
  try {
    const { tripId } = req.body;
    if (!tripId) return res.status(400).json({ error: 'tripId required' });
    if (activeSimulations.has(tripId)) return res.json({ success: true, message: 'Already running' });
    const io = req.app.get('io');
    await runSimulation(tripId, io);
    res.json({ success: true, message: 'Simulation started for ' + tripId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/simulator/start-fleet — start ALL active trips simultaneously */
router.post('/start-fleet', async (req, res) => {
  try {
    const io = req.app.get('io');
    const activeTrips = await Trip.find({ status: { $in: ['Started', 'In Progress'] } }).lean();
    if (!activeTrips.length) return res.status(400).json({ error: 'No active trips found. Load demo data first.' });

    // Stagger start by 600ms each so they don't all tick at the same time
    let started = 0;
    for (let i = 0; i < activeTrips.length; i++) {
      const t = activeTrips[i];
      if (!activeSimulations.has(t.tripId)) {
        setTimeout(() => runSimulation(t.tripId, io), i * 600);
        started++;
      }
    }
    res.json({ success: true, message: `Fleet simulation started for ${started} vehicles` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/simulator/stop — stop a single trip */
router.post('/stop', (req, res) => {
  const { tripId } = req.body;
  const id = activeSimulations.get(tripId);
  if (id) {
    clearInterval(id);
    activeSimulations.delete(tripId);
  }
  res.json({ success: true });
});

/** POST /api/simulator/stop-fleet — stop ALL running simulations */
router.post('/stop-fleet', (req, res) => {
  let stopped = 0;
  for (const [tripId, id] of activeSimulations.entries()) {
    clearInterval(id);
    activeSimulations.delete(tripId);
    stopped++;
  }
  res.json({ success: true, stopped });
});

/** GET /api/simulator/status */
router.get('/status', (req, res) => {
  res.json({ running: Array.from(activeSimulations.keys()) });
});

module.exports = router;
module.exports.broadcastStats = broadcastStats;
