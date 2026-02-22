const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');

router.get('/', async (req, res) => {
  try {
    const { region, officeId, isActive } = req.query;
    const filter = {};
    if (region) filter.region = region;
    if (officeId) filter.officeId = officeId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const vehicles = await Vehicle.find(filter).lean();
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:vehicleId', async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({ vehicleId: req.params.vehicleId }).lean();
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
