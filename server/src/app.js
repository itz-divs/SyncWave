// server/src/app.js
// Purpose: Configures and exports the Express application instance, including middleware and routes.

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/room.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app = express();

// Enable Cross-Origin Resource Sharing (CORS) for our frontend client
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Built-in Express middleware to parse incoming JSON payloads in request bodies
app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;
