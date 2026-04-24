const express = require('express');
const router = express.Router();
const templates = require('../data/templates.json');

/**
 * GET /api/templates
 * Returns all available workflow templates
 */
router.get('/', (req, res) => {
  const summaries = templates.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    nodeCount: t.nodes.length,
    edgeCount: t.edges.length,
  }));

  res.json({ success: true, data: summaries });
});

/**
 * GET /api/templates/:id
 * Returns a specific workflow template with full node/edge data
 */
router.get('/:id', (req, res) => {
  const template = templates.find(t => t.id === req.params.id);
  if (!template) {
    return res.status(404).json({ success: false, error: 'Template not found' });
  }
  res.json({ success: true, data: template });
});

module.exports = router;
