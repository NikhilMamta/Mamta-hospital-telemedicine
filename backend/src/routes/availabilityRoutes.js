import express from 'express';
import {
  getDoctorAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from '../controllers/availabilityController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/:doctorId', getDoctorAvailability);

// Admin-only routes
router.post('/', protectAdmin, createAvailability);
router.put('/:id', protectAdmin, updateAvailability);
router.delete('/:id', protectAdmin, deleteAvailability);

export default router;
