const express = require('express');
const cors = require('cors');
const path = require('path');

const { ensureDataFiles } = require('./data/store');
const { errorHandler } = require('./middleware/errorHandler');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');

// ─── Initialize   
const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data files exist before starting
ensureDataFiles();

// ─── Middleware  
app.use(cors());
app.use(express.json());

// Serve frontend dashboard
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes   
app.use('/api/events', eventRoutes);
app.use('/api', registrationRoutes);

// ─── Health check   
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Event Registration API is running.', timestamp: new Date().toISOString() });
});

// ─── 404 handler for unknown API routes  
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested API endpoint does not exist.' },
  });
});

// ─── Centralized error handler   
app.use(errorHandler);

// ─── Start server   
app.listen(PORT, () => {
  console.log(`\n  Event Registration API is running`);
  console.log(`   ➜  API:        http://localhost:${PORT}/api`);
  console.log(`   ➜  Dashboard:  http://localhost:${PORT}`);
  console.log(`   ➜  Health:     http://localhost:${PORT}/api/health\n`);
});
