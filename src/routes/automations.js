const express = require('express');
const router = express.Router();
const automations = require('../data/automations.json');

/**
 * GET /api/automations
 * Returns the list of available automation actions
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: automations,
    total: automations.length,
  });
});

/**
 * GET /api/automations/:id
 * Returns a specific automation action by ID
 */
router.get('/:id', (req, res) => {
  const automation = automations.find(a => a.id === req.params.id);
  if (!automation) {
    return res.status(404).json({ success: false, error: 'Automation not found' });
  }
  res.json({ success: true, data: automation });
});

module.exports = router;
