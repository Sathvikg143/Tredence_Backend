const express = require('express');
const router = express.Router();
const SimulationEngine = require('../services/simulator');

/**
 * POST /api/simulate
 * Accepts a workflow JSON and returns step-by-step execution results
 * 
 * Request body: { nodes: [], edges: [] }
 * Response: { success, validation, steps[], summary }
 */
router.post('/', (req, res) => {
  const { nodes, edges } = req.body;

  if (!nodes || !Array.isArray(nodes)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request: "nodes" array is required',
    });
  }

  if (!edges || !Array.isArray(edges)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request: "edges" array is required',
    });
  }

  try {
    const result = SimulationEngine.simulate({ nodes, edges });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Simulation failed: ' + error.message,
    });
  }
});

/**
 * POST /api/simulate/validate
 * Validates workflow structure without running simulation
 */
router.post('/validate', (req, res) => {
  const { nodes, edges } = req.body;

  if (!nodes || !edges) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request: "nodes" and "edges" arrays are required',
    });
  }

  try {
    const validation = SimulationEngine.validate({ nodes, edges });
    res.json({ success: true, ...validation });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation failed: ' + error.message,
    });
  }
});

module.exports = router;
