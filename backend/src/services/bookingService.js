import Doctor from '../models/Doctor.js';
import Booking from '../models/Booking.js';
import { getAvailableSlots } from './slotService.js';
import { generateBookingId } from '../utils/generateBookingId.js';

/**
 * Creates a new booking after executing rigorous availability and conflict validations
 */
export const createNewBooking = async (bookingData) => {
  const { doctorId, patient, date: dateStr, startTime } = bookingData;

  // 1. Verify doctor exists and is active
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }
  if (!doctor.isActive) {
    throw new Error('Doctor is not active and cannot accept consultations');
  }

  // 2. Fetch available slots for the date
  const slotData = await getAvailableSlots(doctorId, dateStr);
  const requestedSlot = slotData.slots.find((slot) => slot.startTime === startTime);

  if (!requestedSlot) {
    throw new Error('The requested slot is invalid for this doctor availability schedule');
  }

  if (!requestedSlot.available) {
    throw new Error('The requested slot is already booked or lies in the past');
  }

  // 3. Double-check for overlapping bookings directly in the database (concurrency safeguard)
  const [year, month, day] = dateStr.split('-').map(Number);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  const existingBooking = await Booking.findOne({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    startTime,
    bookingStatus: { $ne: 'cancelled' },
  });

  if (existingBooking) {
    throw new Error('This slot has already been booked by another patient');
  }

  // 4. Determine booking ID sequence
  const dailyCount = await Booking.countDocuments({
    date: { $gte: startOfDay, $lte: endOfDay },
  });
  
  const bookingId = generateBookingId(startOfDay, dailyCount + 1);

  // 5. Populate and save booking
  const newBooking = new Booking({
    bookingId,
    doctorId,
    patient,
    date: startOfDay, // Stored at midnight UTC
    startTime,
    endTime: requestedSlot.endTime,
    amount: doctor.consultationFee,
    currency: 'INR',
    bookingStatus: 'pending',
    paymentStatus: 'pending',
  });

  await newBooking.save();
  return newBooking;
};
