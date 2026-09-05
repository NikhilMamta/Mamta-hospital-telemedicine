import Booking from '../models/Booking.js';
import Doctor from '../models/Doctor.js';
import { createNewBooking } from '../services/bookingService.js';
import { getAvailableSlots } from '../services/slotService.js';
import { createOrder, verifyPayment } from '../services/paymentService.js';
import { createCalcomBooking } from '../services/calcomService.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * @desc    Create a new booking (patient facing)
 * @route   POST /api/bookings
 * @access  Public
 */
export const createBooking = async (req, res, next) => {
  const { doctorId, patient, date, startTime } = req.body;

  try {
    // 1. Basic validation of request body
    if (!doctorId || !patient || !date || !startTime) {
      return sendError(res, 'Missing required booking fields', 400);
    }

    const { name, email, phone, age, gender } = patient;
    if (!name || !email || !phone || !age || !gender) {
      return sendError(res, 'Missing patient details', 400);
    }

    // 2. Delegate to booking service
    const booking = await createNewBooking({
      doctorId,
      patient,
      date,
      startTime,
    });

    // 3. Initiate future Razorpay order placeholder
    let razorpayOrder = null;
    try {
      razorpayOrder = await createOrder(booking._id);
    } catch (paymentErr) {
      console.error('Error generating Razorpay order placeholder:', paymentErr.message);
    }

    return sendSuccess(res, {
      booking,
      razorpayOrder,
    }, 201);
  } catch (error) {
    // Check validation error messages
    if (error.message.includes('not found') || error.message.includes('inactive')) {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('invalid') || error.message.includes('already booked') || error.message.includes('past')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * @desc    Verify Razorpay payment and confirm booking
 * @route   POST /api/payments/verify
 * @access  Public
 */
export const verifyPaymentHandler = async (req, res, next) => {
  const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  try {
    if (!bookingId) {
      return sendError(res, 'bookingId is required for payment verification', 400);
    }

    const result = await verifyPayment(
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    return sendSuccess(res, result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('Invalid payment signature')) {
      return sendError(res, error.message, 400);
    }
    next(error);
  }
};

/**
 * @desc    Get booking details by public bookingId string (e.g. HC-20260825-0001)
 * @route   GET /api/bookings/:bookingId
 * @access  Public
 */
export const getBookingByBookingId = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
      .populate('doctorId', 'name specialization qualification profileImage');

    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    return sendSuccess(res, booking);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all bookings (Admin only)
 * @route   GET /api/admin/bookings
 * @access  Private (Admin)
 */
export const getAdminBookings = async (req, res, next) => {
  const { doctorId, bookingStatus, paymentStatus, date } = req.query;

  try {
    const filter = {};

    if (doctorId) filter.doctorId = doctorId;
    if (bookingStatus) filter.bookingStatus = bookingStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const bookings = await Booking.find(filter)
      .populate('doctorId', 'name specialization qualification consultationFee')
      .sort({ createdAt: -1 });

    return sendSuccess(res, bookings);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a booking (Admin only)
 * @route   PUT /api/admin/bookings/:id
 * @access  Private (Admin)
 */
export const updateAdminBooking = async (req, res, next) => {
  const { bookingStatus, paymentStatus, razorpayPaymentId } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    if (bookingStatus) booking.bookingStatus = bookingStatus;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (razorpayPaymentId) booking.razorpayPaymentId = razorpayPaymentId;

    await booking.save();

    // Fetch fresh populated record to return
    const updatedBooking = await Booking.findById(booking._id)
      .populate('doctorId', 'name specialization qualification profileImage');

    return sendSuccess(res, updatedBooking);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend confirmation email for a booking (Admin only)
 * @route   POST /api/admin/bookings/:id/resend-confirmation
 * @access  Private (Admin)
 */
/**
 * @desc    Retry Cal.com booking creation for a failed/pending booking (Admin only)
 * @route   POST /api/admin/bookings/:id/retry-calcom
 * @access  Private (Admin)
 */
export const retryCalcomBookingHandler = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('doctorId');
    if (!booking) {
      return sendError(res, 'Booking not found', 404);
    }

    // Only retry if payment has been confirmed
    if (booking.paymentStatus !== 'paid') {
      return sendError(res, 'Cannot retry Cal.com booking — payment has not been verified', 400);
    }

    // Idempotency: skip if Cal.com booking already exists
    if (booking.calcomBookingUid) {
      const updatedBooking = await Booking.findById(booking._id)
        .populate('doctorId', 'name specialization qualification profileImage');
      return sendSuccess(res, {
        message: `Cal.com booking already exists (UID: ${booking.calcomBookingUid}) — no retry needed`,
        booking: updatedBooking,
      });
    }

    const doctor = booking.doctorId;
    if (!doctor) {
      return sendError(res, 'Doctor not found for this booking', 404);
    }

    const calResult = await createCalcomBooking(booking, doctor);

    if (calResult.error) {
      return sendError(res, `Cal.com retry failed: ${calResult.error}`, 502);
    }

    if (calResult.calcomBookingId) booking.calcomBookingId = calResult.calcomBookingId;
    if (calResult.calcomBookingUid) booking.calcomBookingUid = calResult.calcomBookingUid;
    if (calResult.googleMeetLink) booking.googleMeetLink = calResult.googleMeetLink;
    if (calResult.calcomStatus) booking.calcomStatus = calResult.calcomStatus;

    // Promote calcom_pending → confirmed
    if (booking.bookingStatus === 'calcom_pending') {
      booking.bookingStatus = 'confirmed';
    }

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('doctorId', 'name specialization qualification profileImage');

    return sendSuccess(res, {
      message: 'Cal.com booking created successfully',
      booking: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get slots for a doctor on a specific date
 * @route   GET /api/doctors/:doctorId/slots
 * @access  Public
 */
export const getDoctorSlotsHandler = async (req, res, next) => {
  const { doctorId } = req.params;
  const { date } = req.query; // YYYY-MM-DD

  try {
    if (!date) {
      return sendError(res, 'Date query parameter is required (format: YYYY-MM-DD)', 400);
    }

    const slotsData = await getAvailableSlots(doctorId, date);
    return sendSuccess(res, slotsData);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('inactive')) {
      return sendError(res, error.message, 404);
    }
    next(error);
  }
};

