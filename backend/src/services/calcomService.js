/**
 * Cal.com API v2 Service
 * 
 * All Cal.com API calls are server-side only.
 * Credentials are never exposed to the frontend.
 * 
 * API Base: https://api.cal.com/v2
 * Auth: Bearer token (CALCOM_API_KEY)
 * Version header: cal-api-version: 2026-02-25
 */

const CALCOM_BASE_URL = (process.env.CALCOM_BASE_URL || 'https://api.cal.com/v2').replace(/\/+$/, '');
const CALCOM_API_KEY = process.env.CALCOM_API_KEY || '';
const CALCOM_API_VERSION = '2026-02-25';

/**
 * Shared fetch helper for Cal.com API v2
 */
const calcomFetch = async (method, path, body = null) => {
  if (!CALCOM_API_KEY || CALCOM_API_KEY.includes('placeholder') || CALCOM_API_KEY === '') {
    throw new Error('[CALCOM] CALCOM_API_KEY is not configured.');
  }

  const url = `${CALCOM_BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${CALCOM_API_KEY}`,
      'cal-api-version': CALCOM_API_VERSION,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const errMsg = data?.message || data?.error || text || `HTTP ${response.status}`;
    throw new Error(`[CALCOM API] ${method} ${path} failed: ${errMsg}`);
  }

  return data;
};

/**
 * Convert a booking date + HH:mm time into an ISO 8601 UTC string for Cal.com.
 * Booking date is stored as UTC midnight; time is in Asia/Kolkata (IST = UTC+5:30).
 */
const toCalcomISO = (dateObj, timeHHmm) => {
  const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
  const [hours, minutes] = timeHHmm.split(':').map(Number);
  // IST is UTC+5:30 - subtract 330 minutes to get UTC
  const totalMinutesIST = hours * 60 + minutes;
  const totalMinutesUTC = totalMinutesIST - 330;
  const utcDate = new Date(`${dateStr}T00:00:00Z`);
  utcDate.setMinutes(utcDate.getMinutes() + totalMinutesUTC);
  return utcDate.toISOString();
};

/**
 * Creates a Cal.com booking after Razorpay payment is verified.
 * Only passes non-sensitive patient information.
 * Does NOT throw - returns { error } on failure so payment flow is never broken.
 */
export const createCalcomBooking = async (booking, doctor) => {
  try {
    const eventTypeId = doctor.calcomEventTypeId ||
                        parseInt(process.env.CALCOM_EVENT_TYPE_ID || '0', 10);

    if (!eventTypeId) {
      return { error: 'No Cal.com event type ID configured for this doctor' };
    }

    const startISO = toCalcomISO(booking.date, booking.startTime);

    const payload = {
      eventTypeId,
      start: startISO,
      attendee: {
        name: booking.patient.name,
        email: booking.patient.email,
        timeZone: 'Asia/Kolkata',
        language: 'en',
      },
      guests: doctor.email ? [doctor.email] : [],
      metadata: {
        hospitalBookingId: booking.bookingId,
        consultationType: 'Online Video Consultation',
        doctorName: `Dr. ${doctor.name}`,
      },
    };

    if (booking.patient.phone) {
      payload.attendee.phoneNumber = booking.patient.phone;
    }

    console.log(`[CALCOM] Creating booking for ${booking.bookingId} with event type ${eventTypeId}`);

    const response = await calcomFetch('POST', '/bookings', payload);
    const bookingData = response.data || response;

    const calcomBookingId = bookingData.id || null;
    const calcomBookingUid = bookingData.uid || '';
    const calcomStatus = bookingData.status || 'accepted';

    let googleMeetLink = '';
    if (bookingData.meetingUrl) {
      googleMeetLink = bookingData.meetingUrl;
    } else if (bookingData.location && typeof bookingData.location === 'string' && bookingData.location.startsWith('https://')) {
      googleMeetLink = bookingData.location;
    } else if (Array.isArray(bookingData.references)) {
      const meetRef = bookingData.references.find(
        (r) => r.type === 'google_meet_video' || r.type === 'google-meet-video'
      );
      if (meetRef) {
        googleMeetLink = meetRef.meetingUrl || meetRef.meetingId || '';
      }
    }

    console.log(`[CALCOM] Booking created - ID: ${calcomBookingId}, UID: ${calcomBookingUid}, Status: ${calcomStatus}`);
    if (googleMeetLink) {
      console.log(`[CALCOM] Google Meet Link: ${googleMeetLink}`);
    } else {
      console.warn(`[CALCOM] No Google Meet link in response yet - will arrive via webhook.`);
    }

    return { calcomBookingId, calcomBookingUid, googleMeetLink, calcomStatus };
  } catch (error) {
    console.error(`[CALCOM] createCalcomBooking failed for ${booking.bookingId}: ${error.message}`);
    return { error: error.message };
  }
};

/**
 * Cancels a Cal.com booking by UID.
 */
export const cancelCalcomBooking = async (calcomBookingUid, reason = 'Cancelled by hospital admin') => {
  if (!calcomBookingUid) {
    console.warn('[CALCOM] cancelCalcomBooking called with no UID - skipping');
    return { skipped: true };
  }
  try {
    const response = await calcomFetch('DELETE', `/bookings/${calcomBookingUid}`, {
      cancellationReason: reason,
    });
    console.log(`[CALCOM] Booking ${calcomBookingUid} cancelled`);
    return { success: true, data: response };
  } catch (error) {
    console.error(`[CALCOM] cancelCalcomBooking failed for UID ${calcomBookingUid}: ${error.message}`);
    return { error: error.message };
  }
};

/**
 * Reschedules a Cal.com booking by UID.
 */
export const rescheduleCalcomBooking = async (calcomBookingUid, newStartISO) => {
  if (!calcomBookingUid || !newStartISO) {
    return { error: 'calcomBookingUid and newStartISO are required' };
  }
  try {
    const response = await calcomFetch('POST', `/bookings/${calcomBookingUid}/reschedule`, {
      start: newStartISO,
    });
    console.log(`[CALCOM] Booking ${calcomBookingUid} rescheduled to ${newStartISO}`);
    return { success: true, data: response };
  } catch (error) {
    console.error(`[CALCOM] rescheduleCalcomBooking failed for UID ${calcomBookingUid}: ${error.message}`);
    return { error: error.message };
  }
};