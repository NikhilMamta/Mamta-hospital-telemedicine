import { getGoogleCalendarClient } from '../config/google.js';

/**
 * Converts booking date string/Date + HH:mm time into an ISO string with +05:30 IST offset.
 * Example: date="2026-08-25", time="10:30" => "2026-08-25T10:30:00+05:30"
 */
const formatISTISOString = (dateInput, timeHHmm) => {
  let dateStr = '';
  if (dateInput instanceof Date) {
    dateStr = dateInput.toISOString().split('T')[0];
  } else if (typeof dateInput === 'string') {
    dateStr = dateInput.split('T')[0];
  } else {
    throw new Error('Invalid date format for IST formatting');
  }

  const timeStr = timeHHmm.length === 5 ? `${timeHHmm}:00` : timeHHmm;
  return `${dateStr}T${timeStr}+05:30`;
};

/**
 * Creates a Google Calendar Event with a unique Google Meet video conference.
 * 
 * @param {Object} booking - Populated MongoDB booking document
 * @param {Object} doctor - Doctor document
 * @returns {Promise<{ googleCalendarEventId: string, googleMeetUrl: string }>}
 */
export const createGoogleCalendarEvent = async (booking, doctor) => {
  const calendar = getGoogleCalendarClient();
  const calendarId = (process.env.GOOGLE_CALENDAR_ID || 'primary').trim();

  const doctorName = doctor?.name || 'Doctor';
  const patientName = booking.patient?.name || 'Patient';
  const patientEmail = booking.patient?.email;
  const doctorEmail = doctor?.email;

  const startISO = formatISTISOString(booking.date, booking.startTime);
  const endISO = formatISTISOString(booking.date, booking.endTime);

  const eventSummary = `Video Consultation - Dr. ${doctorName}`;
  const eventDescription = `Mamta Superspeciality Hospital\nOnline Video Consultation\n\nPatient: ${patientName}\nBooking ID: ${booking.bookingId}`;

  const attendees = [];
  if (patientEmail) attendees.push({ email: patientEmail });
  if (doctorEmail) attendees.push({ email: doctorEmail });

  // Unique requestId for every booking ensuring unique Google Meet URL creation
  const uniqueRequestId = `meet_${booking.bookingId}_${Date.now()}`;

  const eventPayload = {
    summary: eventSummary,
    description: eventDescription,
    start: {
      dateTime: startISO,
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: endISO,
      timeZone: 'Asia/Kolkata',
    },
    attendees,
    conferenceData: {
      createRequest: {
        requestId: uniqueRequestId,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
  };

  console.log(`[GOOGLE CALENDAR] Creating event for booking ${booking.bookingId} (${startISO} to ${endISO})...`);

  const response = await calendar.events.insert({
    calendarId,
    requestBody: eventPayload,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
  });

  const eventData = response.data;
  const googleCalendarEventId = eventData.id;

  // Extract Google Meet video link
  let googleMeetUrl = '';

  if (eventData.conferenceData && eventData.conferenceData.entryPoints) {
    const videoEntryPoint = eventData.conferenceData.entryPoints.find(
      (ep) => ep.entryPointType === 'video'
    );
    if (videoEntryPoint && videoEntryPoint.uri) {
      googleMeetUrl = videoEntryPoint.uri;
    }
  }

  // Fallback to hangoutLink if available
  if (!googleMeetUrl && eventData.hangoutLink) {
    googleMeetUrl = eventData.hangoutLink;
  }

  if (!googleMeetUrl) {
    console.warn(`[GOOGLE CALENDAR] Event created (ID: ${googleCalendarEventId}) but Google Meet URL was not returned immediately.`);
  } else {
    console.log(`[GOOGLE CALENDAR] Successfully created event ${googleCalendarEventId} with Meet URL: ${googleMeetUrl}`);
  }

  return {
    googleCalendarEventId,
    googleMeetUrl,
  };
};

/**
 * Cancels/Deletes a Google Calendar Event by Event ID.
 * 
 * @param {string} googleCalendarEventId 
 */
export const deleteGoogleCalendarEvent = async (googleCalendarEventId) => {
  if (!googleCalendarEventId) return;

  try {
    const calendar = getGoogleCalendarClient();
    const calendarId = (process.env.GOOGLE_CALENDAR_ID || 'primary').trim();

    await calendar.events.delete({
      calendarId,
      eventId: googleCalendarEventId,
      sendUpdates: 'all',
    });
    console.log(`[GOOGLE CALENDAR] Deleted event ${googleCalendarEventId}`);
  } catch (error) {
    console.error(`[GOOGLE CALENDAR] Failed to delete event ${googleCalendarEventId}: ${error.message}`);
  }
};
