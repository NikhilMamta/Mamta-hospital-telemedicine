import express from 'express';
import {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from '../controllers/doctorController.js';
import { getDoctorSlotsHandler } from '../controllers/bookingController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.get('/:doctorId/slots', getDoctorSlotsHandler);

// Admin-only routes
router.post('/', protectAdmin, createDoctor);
router.put('/:id', protectAdmin, updateDoctor);
router.delete('/:id', protectAdmin, deleteDoctor);

export default router;
