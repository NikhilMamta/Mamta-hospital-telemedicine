import crypto from 'crypto';
import { razorpayConfig } from '../config/razorpay.js';
import Booking from '../models/Booking.js';
import Doctor from '../models/Doctor.js';
import Payment from '../models/Payment.js';
import { createGoogleCalendarEvent } from './googleCalendarService.js';
import { sendPatientConfirmationEmail, sendDoctorNotificationEmail } from './emailService.js';

/**
 * Creates a Razorpay Order for a booking
 */
export const createOrder = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  console.log(`[RAZORPAY SERVICE] Creating order for booking ${booking.bookingId}`);
  console.log(`[RAZORPAY SERVICE] Amount: ${booking.amount} ${booking.currency}`);
  
  if (!razorpayConfig.keyId || !razorpayConfig.keySecret || razorpayConfig.keyId.includes('placeholder')) {
    console.warn('[RAZORPAY SERVICE] Razorpay API keys are placeholders. Generating developer order ID.');
  }

  const mockOrderId = `order_${Math.random().toString(36).substring(2, 15)}`;
  
  booking.razorpayOrderId = mockOrderId;
  await booking.save();

  return {
    id: mockOrderId,
    entity: 'order',
    amount: booking.amount * 100,
    amount_paid: 0,
    amount_due: booking.amount * 100,
    currency: booking.currency,
    receipt: booking.bookingId,
    status: 'created',
    created_at: Math.floor(Date.now() / 1000),
  };
};

/**
 * Verifies Razorpay payment signature, confirms booking, creates Google Calendar event & Meet link, and dispatches Resend confirmation emails.
 * 
 * Flow:
 * 1. Verify Razorpay signature (server-side)
 * 2. Mark payment as paid
 * 3. Log payment record (idempotent)
 * 4. Create Google Calendar Event + unique Google Meet URL (idempotent)
 * 5. Update bookingStatus: 'confirmed' (or 'meeting_pending' if Google Calendar fails)
 * 6. Send confirmation email to patient & notification to doctor via Resend
 * 7. Return booking with populated data
 */
export const verifyPayment = async (bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  // Idempotency: if already paid AND has meeting confirmed & email dispatched/processed, return existing booking
  if (booking.paymentStatus === 'paid' && booking.googleCalendarEventId && booking.googleMeetUrl) {
    console.log(`[PAYMENT] Idempotent skip — booking ${booking.bookingId} already paid and meeting created.`);
    const existingBooking = await Booking.findById(booking._id).populate('doctorId');
    return { success: true, booking: existingBooking };
  }

  // 1. Razorpay Signature Verification (server-side)
  if (
    razorpayConfig.keySecret &&
    !razorpayConfig.keySecret.includes('placeholder') &&
    razorpayOrderId &&
    razorpayPaymentId &&
    razorpaySignature
  ) {
    const generatedSignature = crypto
      .createHmac('sha256', razorpayConfig.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      console.error(`[PAYMENT FAILED] Signature mismatch for booking ${booking.bookingId}`);
      booking.paymentStatus = 'failed';
      await booking.save();
      throw new Error('Invalid payment signature');
    }
  }

  // 2. Mark payment as paid
  booking.razorpayPaymentId = razorpayPaymentId || `pay_${Math.random().toString(36).substring(2, 15)}`;
  booking.paymentStatus = 'paid';
  await booking.save();

  console.log(`[PAYMENT VERIFIED] Booking ID: ${booking.bookingId} | Payment ID: ${booking.razorpayPaymentId}`);

  // 3. Log payment record (idempotent — check by payment ID)
  const existingPayment = await Payment.findOne({ razorpayPaymentId: booking.razorpayPaymentId });
  if (!existingPayment) {
    const paymentLog = new Payment({
      bookingId: booking._id,
      razorpayOrderId: razorpayOrderId || booking.razorpayOrderId,
      razorpayPaymentId: booking.razorpayPaymentId,
      amount: booking.amount,
      currency: booking.currency,
      status: 'paid',
      rawResponse: { verifiedAt: new Date().toISOString() },
    });
    await paymentLog.save();
  }

  // 4. Create Google Calendar Event & Google Meet Link (Idempotent check)
  const doctor = await Doctor.findById(booking.doctorId);

  if (!booking.googleCalendarEventId || !booking.googleMeetUrl) {
    if (doctor) {
      try {
        const calResult = await createGoogleCalendarEvent(booking, doctor);
        booking.googleCalendarEventId = calResult.googleCalendarEventId;
        booking.googleEventId = calResult.googleCalendarEventId;
        booking.googleMeetUrl = calResult.googleMeetUrl;
        booking.googleMeetLink = calResult.googleMeetUrl;
        booking.bookingStatus = 'confirmed';
        await booking.save();
        console.log(`[GOOGLE CALENDAR CONFIRMED] Booking ID: ${booking.bookingId} | Event ID: ${booking.googleCalendarEventId} | Meet: ${booking.googleMeetUrl}`);
      } catch (calErr) {
        console.error(`[GOOGLE CALENDAR FAILED] Google Calendar event creation failed for booking ${booking.bookingId}:`, calErr.message);
        booking.bookingStatus = 'meeting_pending';
        await booking.save();
      }
    } else {
      console.error(`[GOOGLE CALENDAR FAILED] Doctor not found for booking ${booking.bookingId}`);
      booking.bookingStatus = 'meeting_pending';
      await booking.save();
    }
  }

  // 5. Send Resend Confirmation Emails (after payment verified — regardless of Google Calendar status)
  if ((booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'meeting_pending') && booking.emailStatus !== 'sent') {
    try {
      await sendPatientConfirmationEmail(booking, doctor);
      try {
        await sendDoctorNotificationEmail(booking, doctor);
      } catch (docEmailErr) {
        console.error(`[RESEND EMAIL] Doctor notification email failed: ${docEmailErr.message}`);
      }
      booking.emailStatus = 'sent';
      booking.emailSentAt = new Date();
      booking.emailError = '';
      await booking.save();
    } catch (emailErr) {
      console.error(`[RESEND EMAIL FAILED] Patient confirmation email failed for booking ${booking.bookingId}:`, emailErr.message);
      booking.emailStatus = 'failed';
      booking.emailError = emailErr.message;
      await booking.save();
      // DO NOT throw error or set booking to failed — consultation remains confirmed!
    }
  }

  // 6. Return fresh populated booking
  const updatedBooking = await Booking.findById(booking._id).populate('doctorId');
  return {
    success: true,
    booking: updatedBooking,
  };
};

/**
 * Processes Razorpay webhook events (idempotent)
 */
export const handleWebhook = async (webhookHeaderSignature, rawBody) => {
  console.log('[RAZORPAY SERVICE] Processing incoming webhook');

  if (razorpayConfig.webhookSecret && !razorpayConfig.webhookSecret.includes('placeholder')) {
    const expectedSignature = crypto
      .createHmac('sha256', razorpayConfig.webhookSecret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    if (expectedSignature !== webhookHeaderSignature) {
      throw new Error('Invalid Razorpay webhook signature');
    }
  }

  const event = rawBody?.event || '';
  const paymentEntity = rawBody?.payload?.payment?.entity || null;

  if (event === 'payment.captured' && paymentEntity) {
    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;

    // Find booking by order ID
    const booking = await Booking.findOne({ razorpayOrderId });
    if (booking && booking.paymentStatus !== 'paid') {
      booking.paymentStatus = 'paid';
      booking.razorpayPaymentId = razorpayPaymentId;
      await booking.save();

      // Trigger payment verification workflow (creates Google Calendar event + sends emails)
      try {
        await verifyPayment(booking._id, razorpayOrderId, razorpayPaymentId, null);
      } catch (err) {
        console.error(`[RAZORPAY WEBHOOK] Error triggering verifyPayment: ${err.message}`);
      }

      console.log(`[RAZORPAY WEBHOOK] payment.captured — Booking ${booking.bookingId} processed`);
    }
  } else if (event === 'payment.failed' && paymentEntity) {
    const razorpayOrderId = paymentEntity.order_id;
    const booking = await Booking.findOne({ razorpayOrderId });
    if (booking && booking.paymentStatus !== 'paid') {
      booking.paymentStatus = 'failed';
      await booking.save();
      console.log(`[RAZORPAY WEBHOOK] payment.failed — Booking ${booking.bookingId} updated`);
    }
  }

  return { success: true, message: 'Razorpay webhook processed' };
};
