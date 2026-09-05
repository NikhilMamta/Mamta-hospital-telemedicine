import crypto from 'crypto';
import Booking from '../models/Booking.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Validates the Cal.com webhook signature using HMAC-SHA256.
 * Header: X-Cal-Signature-256
 * Secret: CALCOM_WEBHOOK_SECRET env var
 */
const verifyCalcomSignature = (rawBody, signatureHeader) => {
  const secret = process.env.CALCOM_WEBHOOK_SECRET || '';
  if (!secret || !signatureHeader) return false;

  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const digest = hmac.digest('hex');
    
    // Normalize signature header (remove 'sha256=' prefix if present)
    const cleanHeader = signatureHeader.replace(/^sha256=/i, '').trim();

    return crypto.timingSafeEqual(
      Buffer.from(cleanHeader, 'hex'),
      Buffer.from(digest, 'hex')
    );
  } catch {
    return false;
  }
};

/**
 * @desc    Handle Cal.com webhook events
 * @route   POST /api/webhooks/calcom
 * @access  Public (validated by HMAC signature)
 */
export const calcomWebhookHandler = async (req, res, next) => {
  try {
    console.log('[CALCOM WEBHOOK] Request received');
    
    // req.body is raw Buffer because we use express.raw() on this route
    const rawBody = req.body;
    const signatureHeader = req.headers['x-cal-signature-256'] || req.headers['X-Cal-Signature-256'] || '';
    const webhookSecret = process.env.CALCOM_WEBHOOK_SECRET || '';

    const hasSecret = Boolean(webhookSecret && webhookSecret !== 'placeholder');
    const hasHeader = Boolean(signatureHeader);
    const hasRawBody = Boolean(rawBody && Buffer.isBuffer(rawBody) && rawBody.length > 0);

    console.log(`[CALCOM WEBHOOK] Secret configured: ${hasSecret ? 'YES' : 'NO'}`);
    console.log(`[CALCOM WEBHOOK] Signature header present: ${hasHeader ? 'YES' : 'NO'}`);
    console.log(`[CALCOM WEBHOOK] Raw body available: ${hasRawBody ? 'YES' : 'NO'}`);

    const isValid = verifyCalcomSignature(rawBody, signatureHeader);
    console.log(`[CALCOM WEBHOOK] Signature verification: ${isValid ? 'PASS' : 'FAIL'}`);

    // Signature validation
    if (hasSecret) {
      if (!isValid) {
        console.warn('[CALCOM WEBHOOK] Invalid signature - request rejected');
        return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
      }
    } else {
      console.warn('[CALCOM WEBHOOK] CALCOM_WEBHOOK_SECRET not configured - skipping signature check (dev mode)');
    }

    // Parse the raw body
    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid JSON body' });
    }

    const { triggerEvent, payload: eventPayload } = payload;

    if (!triggerEvent || !eventPayload) {
      return res.status(200).json({ success: true, message: 'Unrecognised webhook structure - ignored' });
    }

    const calcomUid = eventPayload.uid || '';
    const calcomBookingId = eventPayload.id || null;

    console.log(`[CALCOM WEBHOOK] Event: ${triggerEvent} | UID: ${calcomUid}`);

    // Find our booking by calcomBookingUid or fall back to metadata hospitalBookingId
    let booking = null;

    if (calcomUid) {
      booking = await Booking.findOne({ calcomBookingUid: calcomUid });
    }

    // Try metadata fallback
    if (!booking && eventPayload.metadata?.hospitalBookingId) {
      booking = await Booking.findOne({ bookingId: eventPayload.metadata.hospitalBookingId });
    }

    if (!booking) {
      console.warn(`[CALCOM WEBHOOK] No matching booking found for UID: ${calcomUid}`);
      return res.status(200).json({ success: true, message: 'Booking not found - webhook acknowledged' });
    }

    // --- Process event ---
    switch (triggerEvent) {
      case 'BOOKING_CREATED': {
        if (booking.calcomBookingUid === calcomUid && booking.calcomStatus === 'accepted') {
          console.log(`[CALCOM WEBHOOK] BOOKING_CREATED already processed for ${booking.bookingId}`);
          break;
        }

        if (calcomUid) booking.calcomBookingUid = calcomUid;
        if (calcomBookingId) booking.calcomBookingId = calcomBookingId;
        booking.calcomStatus = eventPayload.status || 'accepted';

        const meetLink = extractMeetLink(eventPayload);
        if (meetLink && !booking.googleMeetLink) {
          booking.googleMeetLink = meetLink;
          console.log(`[CALCOM WEBHOOK] Google Meet link saved: ${meetLink}`);
        }

        if (booking.bookingStatus === 'calcom_pending' && booking.paymentStatus === 'paid') {
          booking.bookingStatus = 'confirmed';
          console.log(`[CALCOM WEBHOOK] Booking ${booking.bookingId} promoted from calcom_pending to confirmed`);
        }

        await booking.save();
        console.log(`[CALCOM WEBHOOK] BOOKING_CREATED processed for ${booking.bookingId}`);
        break;
      }

      case 'BOOKING_RESCHEDULED': {
        if (calcomUid) booking.calcomBookingUid = calcomUid;
        booking.calcomStatus = 'rescheduled';

        if (eventPayload.startTime) {
          const newStart = new Date(eventPayload.startTime);
          const hh = String(newStart.getUTCHours() + 5).padStart(2, '0');
          const istMinutes = newStart.getUTCMinutes() + 30;
          const finalHours = parseInt(hh, 10) + Math.floor(istMinutes / 60);
          const finalMins = istMinutes % 60;
          booking.startTime = `${String(finalHours % 24).padStart(2, '0')}:${String(finalMins).padStart(2, '0')}`;
        }

        const reschedMeetLink = extractMeetLink(eventPayload);
        if (reschedMeetLink) booking.googleMeetLink = reschedMeetLink;

        await booking.save();
        console.log(`[CALCOM WEBHOOK] BOOKING_RESCHEDULED processed for ${booking.bookingId}`);
        break;
      }

      case 'BOOKING_CANCELLED': {
        if (booking.bookingStatus !== 'cancelled') {
          booking.bookingStatus = 'cancelled';
          booking.calcomStatus = 'cancelled';
          await booking.save();
          console.log(`[CALCOM WEBHOOK] BOOKING_CANCELLED processed for ${booking.bookingId}`);
        } else {
          console.log(`[CALCOM WEBHOOK] Booking ${booking.bookingId} already cancelled - idempotent skip`);
        }
        break;
      }

      case 'BOOKING_REJECTED': {
        booking.bookingStatus = 'cancelled';
        booking.calcomStatus = 'rejected';
        await booking.save();
        console.log(`[CALCOM WEBHOOK] BOOKING_REJECTED processed for ${booking.bookingId}`);
        break;
      }

      default:
        console.log(`[CALCOM WEBHOOK] Unhandled event type: ${triggerEvent} - acknowledged`);
    }

    return res.status(200).json({ success: true, message: `Webhook ${triggerEvent} processed` });
  } catch (error) {
    console.error('[CALCOM WEBHOOK] Error processing webhook:', error.message);
    return res.status(200).json({ success: false, message: 'Internal error - webhook acknowledged' });
  }
};

/**
 * Extracts a Google Meet link from various locations in the Cal.com webhook payload.
 */
const extractMeetLink = (eventPayload) => {
  if (eventPayload.meetingUrl && eventPayload.meetingUrl.startsWith('https://')) {
    return eventPayload.meetingUrl;
  }
  if (eventPayload.location && typeof eventPayload.location === 'string' && eventPayload.location.startsWith('https://')) {
    return eventPayload.location;
  }
  if (Array.isArray(eventPayload.references)) {
    const meetRef = eventPayload.references.find(
      (r) => r.type === 'google_meet_video' || r.type === 'google-meet-video'
    );
    if (meetRef) return meetRef.meetingUrl || '';
  }
  return '';
};