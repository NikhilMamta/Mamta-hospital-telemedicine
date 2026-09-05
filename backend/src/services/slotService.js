import Doctor from '../models/Doctor.js';
import Availability from '../models/Availability.js';
import Booking from '../models/Booking.js';
import { generateSlots, timeToMinutes } from '../utils/generateSlots.js';

/**
 * Gets available slots for a doctor on a specific date (YYYY-MM-DD)
 */
export const getAvailableSlots = async (doctorId, dateStr) => {
  // 1. Verify doctor exists and is active
  const doctor = await Doctor.findById(doctorId);
  if (!doctor || !doctor.isActive) {
    throw new Error('Doctor not found or is inactive');
  }

  // 2. Parse date and determine day of the week
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = daysOfWeek[dateObj.getDay()];

  // 3. Fetch doctor's recurring availability for this day
  const availability = await Availability.findOne({
    doctorId,
    dayOfWeek,
    isActive: true,
  });

  if (!availability) {
    return {
      date: dateStr,
      doctorId,
      slots: [],
    };
  }

  // 4. Generate candidate slots
  const candidateSlots = generateSlots(
    availability.startTime,
    availability.endTime,
    availability.slotDuration,
    availability.bufferTime
  );

  // 5. Fetch existing bookings for this doctor on this date (not cancelled)
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  const bookings = await Booking.find({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    bookingStatus: { $ne: 'cancelled' },
  });

  // 6. Check timezone for past slots (Asia/Kolkata)
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const todayIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
  
  const currentMinutesIST = nowIST.getHours() * 60 + nowIST.getMinutes();

  // 7. Check each slot for availability
  const finalSlots = candidateSlots.map((slot) => {
    let available = true;

    // A. Check if date is in the past
    if (dateObj < todayIST) {
      available = false;
    } 
    // B. If today, check if start time is in the past
    else if (dateObj.getTime() === todayIST.getTime()) {
      const slotStartMinutes = timeToMinutes(slot.startTime);
      if (slotStartMinutes <= currentMinutesIST) {
        available = false;
      }
    }

    // C. Check overlaps with existing bookings if still candidate available
    if (available) {
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);

      for (const booking of bookings) {
        const bookingStart = timeToMinutes(booking.startTime);
        const bookingEnd = timeToMinutes(booking.endTime);

        // Interval overlap condition: slotStart < bookingEnd && slotEnd > bookingStart
        if (slotStart < bookingEnd && slotEnd > bookingStart) {
          available = false;
          break;
        }
      }
    }

    return {
      startTime: slot.startTime,
      endTime: slot.endTime,
      available,
    };
  });

  return {
    date: dateStr,
    doctorId,
    slots: finalSlots,
  };
};
