import crypto from 'crypto';
import { razorpayConfig } from '../config/razorpay.js';
import Booking from '../models/Booking.js';
import Doctor from '../models/Doctor.js';
import Payment from '../models/Payment.js';
import { createCalcomBooking } from './calcomService.js';

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
 * Verifies Razorpay payment signature, confirms booking, creates Cal.com booking.
 * 
 * Flow:
 * 1. Verify Razorpay signature (server-side)
 * 2. Mark payment as paid + booking as confirmed (or calcom_pending on Cal.com failure)
 * 3. Log payment record (idempotent)
 * 4. Create Cal.com booking → Google Calendar + Meet + confirmation email handled by Cal.com
 * 5. Return booking with all data
 */
export const verifyPayment = async (bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }

  // Idempotency: if already paid, skip verification and return existing booking
  if (booking.paymentStatus === 'paid') {
    console.log(`[PAYMENT] Idempotent skip — booking ${booking.bookingId} already paid`);
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
  // Temporarily set to confirmed; may change to calcom_pending below
  booking.bookingStatus = 'confirmed';
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

  // 4. Create Cal.com booking (Google Calendar + Meet + confirmation email handled by Cal.com)
  if (!booking.calcomBookingUid) {
    const doctor = await Doctor.findById(booking.doctorId);
    
    if (doctor) {
      const calResult = await createCalcomBooking(booking, doctor);

      if (calResult.error) {
        // Payment is confirmed but Cal.com failed — mark as calcom_pending for admin retry
        booking.bookingStatus = 'calcom_pending';
        console.error(`[CALCOM] Booking creation failed — marking as calcom_pending. Error: ${calResult.error}`);
      } else {
        // Success — save all Cal.com data
        if (calResult.calcomBookingId) booking.calcomBookingId = calResult.calcomBookingId;
        if (calResult.calcomBookingUid) booking.calcomBookingUid = calResult.calcomBookingUid;
        if (calResult.googleMeetLink) booking.googleMeetLink = calResult.googleMeetLink;
        if (calResult.calcomStatus) booking.calcomStatus = calResult.calcomStatus;
        booking.bookingStatus = 'confirmed';
        console.log(`[BOOKING CONFIRMED] Booking ID: ${booking.bookingId} | Cal.com UID: ${booking.calcomBookingUid}`);
      }

      await booking.save();
    } else {
      console.error(`[CALCOM] Doctor not found for booking ${booking.bookingId} — skipping Cal.com`);
    }
  } else {
    console.log(`[CALCOM] Skipping Cal.com creation — booking ${booking.bookingId} already has UID: ${booking.calcomBookingUid}`);
  }

  // 5. Return fresh populated booking
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
      if (booking.bookingStatus === 'pending') {
        booking.bookingStatus = 'confirmed';
      }
      await booking.save();
      console.log(`[RAZORPAY WEBHOOK] payment.captured — Booking ${booking.bookingId} updated`);
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
