import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import calcomWebhookRoutes from './routes/calcomWebhookRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

import { notFound } from './middleware/notFoundMiddleware.js';
import { errorHandler } from './middleware/errorMiddleware.js';

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
const corsOptions = {
  origin: (origin, callback) => {
    const staticOrigins = [
      'https://mamta-hospital-telemedicine.vercel.app',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
    ];

    const envOrigins = [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
    ]
      .filter(Boolean)
      .flatMap((url) => url.split(',').map((u) => u.trim().replace(/\/+$/, '')));

    const allowedOrigins = Array.from(new Set([...staticOrigins, ...envOrigins]));
    const cleanOrigin = origin ? origin.replace(/\/+$/, '') : null;

    if (
      !origin ||
      allowedOrigins.includes(cleanOrigin) ||
      (cleanOrigin && cleanOrigin.endsWith('.vercel.app'))
    ) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));


// Development logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Limit requests from same API IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter);

// Cal.com Webhook — MUST be mounted BEFORE express.json() to preserve raw body for HMAC verification
app.use('/api', calcomWebhookRoutes);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (isDbConnected) {
    return res.status(200).json({
      success: true,
      message: 'Hospital Telemedicine API is running',
      database: 'connected',
    });
  }
  return res.status(503).json({
    success: false,
    message: 'Hospital Telemedicine API is unhealthy: Database not connected',
    database: 'disconnected',
  });
});


// Mounting Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api', bookingRoutes); // maps /api/bookings and /api/admin/bookings
app.use('/api/uploads', uploadRoutes);

// Handle 404 (Not Found)
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

export default app;
