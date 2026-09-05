import express from 'express';
import {
  createBooking,
  verifyPaymentHandler,
  getBookingByBookingId,
  getAdminBookings,
  updateAdminBooking,
  retryCalcomBookingHandler,
} from '../controllers/bookingController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public booking & payment routes
router.post('/bookings', createBooking);
router.post('/payments/verify', verifyPaymentHandler);
router.get('/bookings/:bookingId', getBookingByBookingId);

// Protected admin booking routes
router.get('/admin/bookings', protectAdmin, getAdminBookings);
router.put('/admin/bookings/:id', protectAdmin, updateAdminBooking);
router.post('/admin/bookings/:id/retry-calcom', protectAdmin, retryCalcomBookingHandler);

export default router;

