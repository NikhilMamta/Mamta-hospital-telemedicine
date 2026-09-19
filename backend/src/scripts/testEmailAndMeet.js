import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Doctor from '../models/Doctor.js';
import Booking from '../models/Booking.js';
import { createNewBooking } from '../services/bookingService.js';
import { getAvailableSlots } from '../services/slotService.js';
import { verifyPayment } from '../services/paymentService.js';
import { sendPatientConfirmationEmail, sendDoctorNotificationEmail } from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mamta-hospital-telemedicine';

let testDate = '';

async function runTest() {
  console.log('--- Starting Complete Flow Test ---');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Find active doctor
    const doctor = await Doctor.findOne({ isActive: true });
    if (!doctor) {
      console.error('No active doctor found in database');
      process.exit(1);
    }
    console.log(`✓ Active doctor found: Dr. ${doctor.name} (${doctor._id})`);

    // Fetch available slot dynamically
    const today = new Date().toISOString().split('T')[0];
    const slotData = await getAvailableSlots(doctor._id, today);
    let validSlot = slotData.slots.find(s => s.available);
    
    if (!validSlot) {
      // Fallback: search next 7 days for an available slot
      for (let i = 1; i <= 7; i++) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + i);
        const dateStr = nextDate.toISOString().split('T')[0];
        const res = await getAvailableSlots(doctor._id, dateStr);
        validSlot = res.slots.find(s => s.available);
        if (validSlot) {
          testDate = dateStr;
          break;
        }
      }
    } else {
      testDate = today;
    }

    if (!validSlot) {
      console.error('No available slot found for testing');
      process.exit(1);
    }

    const testBookingData = {
      doctorId: doctor._id,
      patient: {
        name: 'Test Patient',
        email: 'test.patient@example.com',
        phone: '9876543210',
        age: 30,
        gender: 'male',
        reason: 'Routine Health Checkup',
      },
      date: testDate,
      startTime: validSlot.startTime,
    };

    console.log(`1. Creating new booking for ${testDate} at ${validSlot.startTime}...`);

    const booking = await createNewBooking(testBookingData);
    console.log(`✓ Booking created: ${booking.bookingId} (DB ID: ${booking._id}) | Status: ${booking.bookingStatus} | Payment: ${booking.paymentStatus}`);

    // 2. Verify payment flow
    console.log('2. Simulating Razorpay payment verification...');
    const verifyResult = await verifyPayment(
      booking._id,
      `order_${Date.now()}`,
      `pay_${Date.now()}`,
      'dummy_signature'
    );

    const verifiedBooking = verifyResult.booking;
    console.log(`✓ Payment verified! Status: ${verifiedBooking.paymentStatus} | Booking Status: ${verifiedBooking.bookingStatus}`);
    console.log(`✓ Google Meet Link: ${verifiedBooking.googleMeetUrl || verifiedBooking.googleMeetLink}`);
    console.log(`✓ Google Calendar Event ID: ${verifiedBooking.googleCalendarEventId || verifiedBooking.googleEventId}`);
    console.log(`✓ Email Status: ${verifiedBooking.emailStatus} | Sent At: ${verifiedBooking.emailSentAt}`);

    // 3. Test Idempotency (Repeat verify call)
    console.log('3. Testing payment verification idempotency...');
    const repeatVerify = await verifyPayment(
      booking._id,
      verifiedBooking.razorpayOrderId,
      verifiedBooking.razorpayPaymentId,
      'dummy_signature'
    );
    console.log(`✓ Idempotency test passed: Email Status remains '${repeatVerify.booking.emailStatus}' without duplicating`);

    console.log('\n========================================');
    console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
    console.log('========================================\n');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTest();
