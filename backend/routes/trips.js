const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const GeofenceEvent = require('../models/GeofenceEvent');
const { logManualOverrideAlert } = require('../services/notificationService');

router.get('/', async (req, res) => {
  try {
    const { status, region, officeId, routeId, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (region) filter.region = region;
    if (officeId) filter.officeId = officeId;
    if (routeId) filter.routeId = routeId;
    if (from || to) {
      filter.startTimestamp = {};
      if (from) filter.startTimestamp.$gte = new Date(from);
      if (to) filter.startTimestamp.$lte = new Date(to);
    }
    const trips = await Trip.find(filter).populate('officeId').sort({ startTimestamp: -1 }).limit(500).lean();
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/active', async (req, res) => {
  try {
    const trips = await Trip.find({ status: { $in: ['Started', 'In Progress'] } })
      .populate('officeId')
      .lean();
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:tripId', async (req, res) => {
  try {
    const trip = await Trip.findOne({ tripId: req.params.tripId }).populate('officeId').lean();
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const trip = await Trip.create(req.body);
    res.status(201).json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:tripId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const trip = await Trip.findOne({ tripId: req.params.tripId });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    const previous = trip.status;
    trip.status = status;
    if (status === 'Started' || status === 'In Progress') trip.startTimestamp = trip.startTimestamp || new Date();
    if (status === 'Completed') {
      trip.endTimestamp = new Date();
      trip.manualOverride = true;
      trip.manualOverrideAt = new Date();
      trip.manualOverrideReason = req.body.reason || 'Manual closure';
      await logManualOverrideAlert(trip.tripId, trip.vehicleId, trip.manualOverrideReason);
    }
    await trip.save();
    const io = req.app.get('io');
    if (io) io.emit('trip:updated', { tripId: trip.tripId, status: trip.status });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:tripId/events', async (req, res) => {
  try {
    const events = await GeofenceEvent.find({ tripId: req.params.tripId }).sort({ timestamp: -1 }).lean();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
