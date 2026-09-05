import Availability from '../models/Availability.js';
import Doctor from '../models/Doctor.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { timeToMinutes } from '../utils/generateSlots.js';

/**
 * @desc    Get all recurring availability entries for a doctor
 * @route   GET /api/availability/:doctorId
 * @access  Public
 */
export const getDoctorAvailability = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const schedule = await Availability.find({ doctorId });
    return sendSuccess(res, schedule);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create availability for a doctor
 * @route   POST /api/availability
 * @access  Private (Admin)
 */
export const createAvailability = async (req, res, next) => {
  const { doctorId, dayOfWeek, startTime, endTime, slotDuration, bufferTime, isActive } = req.body;

  try {
    // 1. Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return sendError(res, 'Doctor not found', 404);
    }

    // 2. Validate schedules constraints
    if (slotDuration <= 0) {
      return sendError(res, 'Slot duration must be greater than 0 minutes', 400);
    }

    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);

    if (startMins >= endMins) {
      return sendError(res, 'Start time must be strictly before end time', 400);
    }

    // 3. Ensure no duplicate day configuration exists for this doctor
    const existingSchedule = await Availability.findOne({ doctorId, dayOfWeek: dayOfWeek.toLowerCase() });
    if (existingSchedule) {
      return sendError(res, `Availability schedule already exists for ${dayOfWeek}. Please update the existing entry instead.`, 400);
    }

    const availability = new Availability({
      doctorId,
      dayOfWeek: dayOfWeek.toLowerCase(),
      startTime,
      endTime,
      slotDuration,
      bufferTime: bufferTime !== undefined ? bufferTime : 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    await availability.save();
    return sendSuccess(res, availability, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update availability entry
 * @route   PUT /api/availability/:id
 * @access  Private (Admin)
 */
export const updateAvailability = async (req, res, next) => {
  const { startTime, endTime, slotDuration, bufferTime, isActive, dayOfWeek } = req.body;

  try {
    const availability = await Availability.findById(req.params.id);
    if (!availability) {
      return sendError(res, 'Availability record not found', 404);
    }

    // Validate schedules constraints if modified
    const nextDuration = slotDuration !== undefined ? slotDuration : availability.slotDuration;
    if (nextDuration <= 0) {
      return sendError(res, 'Slot duration must be greater than 0 minutes', 400);
    }

    const nextStart = startTime || availability.startTime;
    const nextEnd = endTime || availability.endTime;
    const startMins = timeToMinutes(nextStart);
    const endMins = timeToMinutes(nextEnd);

    if (startMins >= endMins) {
      return sendError(res, 'Start time must be strictly before end time', 400);
    }

    // Apply updates
    if (dayOfWeek) availability.dayOfWeek = dayOfWeek.toLowerCase();
    if (startTime) availability.startTime = startTime;
    if (endTime) availability.endTime = endTime;
    if (slotDuration !== undefined) availability.slotDuration = slotDuration;
    if (bufferTime !== undefined) availability.bufferTime = bufferTime;
    if (isActive !== undefined) availability.isActive = isActive;

    await availability.save();
    return sendSuccess(res, availability);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete availability entry
 * @route   DELETE /api/availability/:id
 * @access  Private (Admin)
 */
export const deleteAvailability = async (req, res, next) => {
  try {
    const availability = await Availability.findById(req.params.id);
    if (!availability) {
      return sendError(res, 'Availability record not found', 404);
    }

    await Availability.findByIdAndDelete(req.params.id);
    return sendSuccess(res, { message: 'Availability schedule record deleted successfully' });
  } catch (error) {
    next(error);
  }
};
