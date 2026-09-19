import { Resend } from 'resend';

const getResendClient = () => {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables.');
  }
  return new Resend(apiKey);
};

const getFromEmail = () => {
  return (process.env.RESEND_FROM_EMAIL || 'Mamta Superspeciality Hospital <onboarding@resend.dev>').trim();
};

/**
 * Format Date to readable IST string e.g. "Tuesday, August 25, 2026"
 */
const formatReadableDate = (dateInput) => {
  let dateObj;
  if (dateInput instanceof Date) {
    dateObj = dateInput;
  } else if (typeof dateInput === 'string') {
    const [year, month, day] = dateInput.split('T')[0].split('-').map(Number);
    dateObj = new Date(Date.UTC(year, month - 1, day));
  } else {
    return '';
  }
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
};

/**
 * Format 24-hour time "10:30" to 12-hour AM/PM string "10:30 AM"
 */
const format12HourTime = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours12}:${minutesStr} ${ampm}`;
};

/**
 * Send booking confirmation email to the Patient via Resend SDK
 */
export const sendPatientConfirmationEmail = async (booking, doctor) => {
  const resend = getResendClient();
  const from = getFromEmail();
  const patientEmail = booking.patient?.email;
  const patientName = booking.patient?.name || 'Valued Patient';
  const doctorName = doctor?.name || 'Medical Specialist';
  const doctorSpecialization = doctor?.specialization || 'Consultant';
  const dateFormatted = formatReadableDate(booking.date);
  const timeFormatted = `${format12HourTime(booking.startTime)} - ${format12HourTime(booking.endTime)} IST`;
  const meetUrl = booking.googleMeetUrl || booking.googleMeetLink || '#';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video Consultation Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4EFEA; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2D3748;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4EFEA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0F3D3E; padding: 32px 40px; text-align: center;">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">
                Mamta Superspeciality Hospital
              </h1>
              <p style="color: #C6A969; margin: 6px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                Raipur • Video Consultation Service
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #0F3D3E; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">
                Consultation Booking Confirmed
              </h2>
              <p style="font-size: 15px; line-height: 1.6; color: #4A5568; margin-0 0 24px 0;">
                Dear <strong>${patientName}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #4A5568; margin: 0 0 24px 0;">
                Your online video consultation has been successfully booked with <strong>Mamta Superspeciality Hospital</strong>. Below are your appointment details:
              </p>

              <!-- Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9F7F5; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; line-height: 1.5;">
                      <tr>
                        <td width="38%" style="color: #718096; font-weight: 500;">Booking ID:</td>
                        <td style="color: #0F3D3E; font-weight: 700; font-family: monospace; font-size: 15px;">${booking.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-weight: 500;">Doctor:</td>
                        <td style="color: #2D3748; font-weight: 600;">Dr. ${doctorName} (${doctorSpecialization})</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-weight: 500;">Date:</td>
                        <td style="color: #2D3748; font-weight: 600;">${dateFormatted}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-weight: 500;">Time:</td>
                        <td style="color: #2D3748; font-weight: 600;">${timeFormatted}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-weight: 500;">Mode:</td>
                        <td style="color: #0F3D3E; font-weight: 600;">Online Video Consultation</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${meetUrl}" target="_blank" style="display: inline-block; background-color: #0F3D3E; color: #FFFFFF; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 6px; box-shadow: 0 2px 6px rgba(15, 61, 62, 0.3);">
                      Join Video Consultation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; line-height: 1.6; color: #718096; margin: 0 0 24px 0; text-align: center; background-color: #FFFDF9; border: 1px solid #FCE8C3; padding: 12px; border-radius: 6px;">
                ⏱ <strong>Important Note:</strong> Please click the join link <strong>5 minutes before</strong> your scheduled appointment time.
              </p>

              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 28px 0;" />

              <p style="font-size: 14px; color: #4A5568; margin: 0;">
                Warm Regards,<br>
                <strong>Mamta Superspeciality Hospital</strong><br>
                <span style="color: #718096; font-size: 13px;">Raipur, Chhattisgarh</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9F7F5; padding: 20px 40px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 12px; color: #A0AEC0;">
              This is an automated appointment confirmation from Mamta Superspeciality Hospital.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  console.log(`[RESEND EMAIL] Sending confirmation email to patient ${patientEmail} for booking ${booking.bookingId}...`);

  const response = await resend.emails.send({
    from,
    to: patientEmail,
    subject: 'Video Consultation Confirmed – Mamta Superspeciality Hospital',
    html: htmlContent,
  });

  console.log(`[RESEND EMAIL] Patient confirmation email sent successfully. ID: ${response.data?.id}`);
  return response;
};

/**
 * Send new booking notification email to the Doctor via Resend SDK
 */
export const sendDoctorNotificationEmail = async (booking, doctor) => {
  const resend = getResendClient();
  const from = getFromEmail();
  const doctorEmail = doctor?.email;
  if (!doctorEmail) return;

  const doctorName = doctor?.name || 'Doctor';
  const patientName = booking.patient?.name || 'Patient';
  const patientPhone = booking.patient?.phone || 'N/A';
  const dateFormatted = formatReadableDate(booking.date);
  const timeFormatted = `${format12HourTime(booking.startTime)} - ${format12HourTime(booking.endTime)} IST`;
  const meetUrl = booking.googleMeetUrl || booking.googleMeetLink || '#';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Video Consultation Scheduled</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4EFEA; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2D3748;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4EFEA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
          <tr>
            <td style="background-color: #0F3D3E; padding: 28px 36px; text-align: center;">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 20px; font-weight: 700;">
                Mamta Superspeciality Hospital
              </h1>
              <p style="color: #C6A969; margin: 4px 0 0 0; font-size: 13px; text-transform: uppercase;">
                Doctor Appointment Schedule
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px;">
              <h2 style="color: #0F3D3E; margin: 0 0 16px 0; font-size: 18px;">
                New Video Consultation Scheduled
              </h2>
              <p style="font-size: 15px; color: #4A5568; margin: 0 0 20px 0;">
                Dear <strong>Dr. ${doctorName}</strong>,
              </p>
              <p style="font-size: 15px; color: #4A5568; margin: 0 0 20px 0;">
                A new online video consultation has been confirmed for your schedule:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9F7F5; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px;">
                      <tr>
                        <td width="35%" style="color: #718096; font-weight: 500;">Booking ID:</td>
                        <td style="color: #0F3D3E; font-weight: 700; font-family: monospace;">${booking.bookingId}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-weight: 500;">Patient Name:</td>
                        <td style="color: #2D3748; font-weight: 600;">${patientName}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-weight: 500;">Patient Phone:</td>
                        <td style="color: #2D3748; font-weight: 600;">${patientPhone}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-weight: 500;">Date:</td>
                        <td style="color: #2D3748; font-weight: 600;">${dateFormatted}</td>
                      </tr>
                      <tr>
                        <td style="color: #718096; font-weight: 500;">Time Slot:</td>
                        <td style="color: #2D3748; font-weight: 600;">${timeFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${meetUrl}" target="_blank" style="display: inline-block; background-color: #0F3D3E; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px;">
                      Open Google Meet Room
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #718096; margin: 0;">
                Regards,<br>
                <strong>Mamta Superspeciality Hospital Management</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  console.log(`[RESEND EMAIL] Sending doctor notification email to ${doctorEmail}...`);

  const response = await resend.emails.send({
    from,
    to: doctorEmail,
    subject: 'New Video Consultation – Mamta Superspeciality Hospital',
    html: htmlContent,
  });

  console.log(`[RESEND EMAIL] Doctor notification email sent successfully. ID: ${response.data?.id}`);
  return response;
};

/**
 * Send cancellation notification email via Resend SDK
 */
export const sendCancellationEmail = async (booking, doctor) => {
  const resend = getResendClient();
  const from = getFromEmail();

  const patientEmail = booking.patient?.email;
  const doctorEmail = doctor?.email;
  const patientName = booking.patient?.name || 'Valued Patient';
  const doctorName = doctor?.name || 'Doctor';
  const dateFormatted = formatReadableDate(booking.date);
  const timeFormatted = `${format12HourTime(booking.startTime)} IST`;

  const patientHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #F4EFEA;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px;">
    <h2 style="color: #C53030;">Consultation Cancelled</h2>
    <p>Dear <strong>${patientName}</strong>,</p>
    <p>Your video consultation scheduled with <strong>Dr. ${doctorName}</strong> on <strong>${dateFormatted} at ${timeFormatted}</strong> (Booking ID: <code>${booking.bookingId}</code>) has been cancelled.</p>
    <p>If you have any questions or require rescheduling, please contact our hospital desk.</p>
    <p>Regards,<br><strong>Mamta Superspeciality Hospital</strong></p>
  </div>
</body>
</html>
  `;

  if (patientEmail) {
    try {
      await resend.emails.send({
        from,
        to: patientEmail,
        subject: 'Video Consultation Cancelled – Mamta Superspeciality Hospital',
        html: patientHtml,
      });
      console.log(`[RESEND EMAIL] Cancellation email sent to patient ${patientEmail}`);
    } catch (err) {
      console.error(`[RESEND EMAIL] Failed sending cancellation email to patient: ${err.message}`);
    }
  }

  if (doctorEmail) {
    try {
      await resend.emails.send({
        from,
        to: doctorEmail,
        subject: `Cancelled Consultation Notification – Booking ${booking.bookingId}`,
        html: `<p>Dear Dr. ${doctorName},</p><p>The video consultation with patient <strong>${patientName}</strong> scheduled for <strong>${dateFormatted} at ${timeFormatted}</strong> (Booking ID: <code>${booking.bookingId}</code>) has been cancelled.</p>`,
      });
      console.log(`[RESEND EMAIL] Cancellation email sent to doctor ${doctorEmail}`);
    } catch (err) {
      console.error(`[RESEND EMAIL] Failed sending cancellation email to doctor: ${err.message}`);
    }
  }
};
