import express from 'express';
import {
  createBooking,
  verifyPaymentHandler,
  getBookingByBookingId,
  getAdminBookings,
  updateAdminBooking,
  retryMeetingHandler,
  resendConfirmationEmailHandler,
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
router.post('/admin/bookings/:id/retry-meeting', protectAdmin, retryMeetingHandler);
router.post('/admin/bookings/:id/resend-confirmation', protectAdmin, resendConfirmationEmailHandler);

export default router;
