const express = require('express');
const cors = require('cors');

const automationsRouter = require('./routes/automations');
const simulateRouter = require('./routes/simulate');
const templatesRouter = require('./routes/templates');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'HR Workflow Designer API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/automations', automationsRouter);
app.use('/api/simulate', simulateRouter);
app.use('/api/templates', templatesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 HR Workflow Designer API Server`);
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log(`   Health:     http://localhost:${PORT}/api/health`);
  console.log(`   Endpoints:`);
  console.log(`     GET  /api/automations`);
  console.log(`     GET  /api/automations/:id`);
  console.log(`     POST /api/simulate`);
  console.log(`     POST /api/simulate/validate`);
  console.log(`     GET  /api/templates`);
  console.log(`     GET  /api/templates/:id\n`);
});
