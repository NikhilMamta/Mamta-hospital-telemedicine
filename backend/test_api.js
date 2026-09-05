const API_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('=== STARTING TELEMEDICINE BACKEND INTEGRATION TESTS ===');
  let token = '';
  let doctorId = '';
  let availabilityId = '';
  let bookingId = '';
  let bookingMongoId = '';

  try {
    // 1. Test Admin Login
    console.log('\n1. Testing POST /api/auth/login...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@mamtahospital.com',
        password: 'MamtaHospital@2026',
      }),
    });
    
    const loginData = await loginRes.json();
    if (loginRes.ok && loginData.success && loginData.data.token) {
      token = loginData.data.token;
      console.log('   ✓ Login Successful! Token received.');
    } else {
      throw new Error('Login failed: ' + JSON.stringify(loginData));
    }

    const authHeaders = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` 
    };

    // 2. Test Doctor Creation
    console.log('\n2. Testing POST /api/doctors (Create Doctor)...');
    const doctorPayload = {
      name: 'Dr. John Watson',
      email: 'john.watson@mamtahospital.com',
      phone: '+91 99999 88888',
      specialization: 'General Medicine',
      qualification: 'MD, MBBS',
      experience: 12,
      bio: 'Experienced medical doctor specializing in general diagnostics.',
      consultationFee: 600,
      consultationDuration: 30,
    };
    
    const docRes = await fetch(`${API_URL}/doctors`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(doctorPayload),
    });
    const docData = await docRes.json();
    if (docRes.ok && docData.success && docData.data._id) {
      doctorId = docData.data._id;
      console.log(`   ✓ Doctor created! ID: ${doctorId}`);
    } else {
      throw new Error('Doctor creation failed: ' + JSON.stringify(docData));
    }

    // 3. Test Availability Configuration
    console.log('\n3. Testing POST /api/availability (Set Friday Schedule 10:00 - 13:00)...');
    const availabilityPayload = {
      doctorId,
      dayOfWeek: 'friday',
      startTime: '10:00',
      endTime: '13:00',
      slotDuration: 30,
      bufferTime: 5,
    };

    const availRes = await fetch(`${API_URL}/availability`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(availabilityPayload),
    });
    const availData = await availRes.json();
    if (availRes.ok && availData.success && availData.data._id) {
      availabilityId = availData.data._id;
      console.log(`   ✓ Availability configured! ID: ${availabilityId}`);
    } else {
      throw new Error('Availability configuration failed: ' + JSON.stringify(availData));
    }

    // 4. Test Slot Generation for Friday 2026-08-28 (a Friday)
    console.log('\n4. Testing GET /api/doctors/:id/slots?date=2026-08-28 (Verify generated slots)...');
    const slotsRes = await fetch(`${API_URL}/doctors/${doctorId}/slots?date=2026-08-28`);
    const slotsData = await slotsRes.json();
    
    if (slotsRes.ok && slotsData.success && slotsData.data.slots) {
      const slots = slotsData.data.slots;
      console.log(`   ✓ Generated ${slots.length} slots:`);
      slots.forEach(s => {
        console.log(`     - Slot: ${s.startTime} to ${s.endTime} [Available: ${s.available}]`);
      });
      
      // We expect slots like 10:00-10:30, 10:35-11:05, 11:10-11:40, 11:45-12:15, 12:20-12:50
      if (slots.length !== 5) {
        throw new Error(`Expected 5 slots, but generated ${slots.length}`);
      }
    } else {
      throw new Error('Slot generation failed: ' + JSON.stringify(slotsData));
    }

    // 5. Test Booking Creation
    console.log('\n5. Testing POST /api/bookings (Book 10:00 slot on 2026-08-28)...');
    const bookingPayload = {
      doctorId,
      date: '2026-08-28',
      startTime: '10:00',
      patient: {
        name: 'Arthur Dent',
        email: 'arthur.dent@galaxy.com',
        phone: '+91 77777 66666',
        age: 42,
        gender: 'male',
        reason: 'Frequent space panic attacks',
      },
    };

    const bookingRes = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingPayload),
    });
    const bookingData = await bookingRes.json();
    if (bookingRes.ok && bookingData.success && bookingData.data.booking) {
      const b = bookingData.data.booking;
      bookingId = b.bookingId;
      bookingMongoId = b._id;
      console.log(`   ✓ Booking created! ID String: ${bookingId}, DB ID: ${bookingMongoId}`);
      console.log(`     - Booking Status: ${b.bookingStatus}`);
      console.log(`     - Payment Status: ${b.paymentStatus}`);
      console.log(`     - Amount: ₹${b.amount}`);
      console.log(`     - Razorpay Order ID Placeholder: ${bookingData.data.razorpayOrder?.id}`);
    } else {
      throw new Error('Booking creation failed: ' + JSON.stringify(bookingData));
    }

    // 6. Test Double-Booking Protection (re-book same slot)
    console.log('\n6. Testing POST /api/bookings again for the SAME slot (Verify double-booking protection)...');
    const doubleRes = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingPayload),
    });
    const doubleData = await doubleRes.json();
    if (doubleRes.status === 400) {
      console.log(`   ✓ Double-booking rejected with 400: "${doubleData.message}"`);
    } else {
      throw new Error('Double-booking succeeded when it should have failed: ' + JSON.stringify(doubleData));
    }

    // 7. Test Slot Generation reflection (Verify booked slot is unavailable)
    console.log('\n7. Verify slot status in slot generation list...');
    const slotsRes2 = await fetch(`${API_URL}/doctors/${doctorId}/slots?date=2026-08-28`);
    const slotsData2 = await slotsRes2.json();
    const slots2 = slotsData2.data.slots;
    const bookedSlot = slots2.find(s => s.startTime === '10:00');
    
    if (bookedSlot && bookedSlot.available === false) {
      console.log('   ✓ 10:00 slot is correctly marked as unavailable (booked).');
    } else {
      throw new Error('Booked slot is still available in slot generation output!');
    }

    // 8. Test Booking status confirmation (triggering Google Meet conference generation)
    console.log('\n8. Testing PUT /api/admin/bookings/:id (Confirm booking & trigger Google Meet placeholder)...');
    const updateRes = await fetch(`${API_URL}/admin/bookings/${bookingMongoId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        bookingStatus: 'confirmed',
        paymentStatus: 'paid',
        razorpayPaymentId: 'pay_simulated_success_123',
      }),
    });
    const updateData = await updateRes.json();

    if (updateRes.ok && updateData.success && updateData.data.googleMeetLink) {
      const ub = updateData.data;
      console.log('   ✓ Booking confirmed successfully!');
      console.log(`     - Updated Booking Status: ${ub.bookingStatus}`);
      console.log(`     - Updated Payment Status: ${ub.paymentStatus}`);
      console.log(`     - Google Meet Conference Link: ${ub.googleMeetLink}`);
      console.log(`     - Google Calendar Event ID: ${ub.googleEventId}`);
    } else {
      throw new Error('Booking confirmation or Meet link generation failed: ' + JSON.stringify(updateData));
    }

    // 9. Test Soft Deletion vs Hard Deletion (Doctor with booking)
    console.log('\n9. Testing DELETE /api/doctors/:id (Delete doctor with active bookings)...');
    const deleteRes = await fetch(`${API_URL}/doctors/${doctorId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const deleteData = await deleteRes.json();
    
    if (deleteRes.ok && deleteData.success && deleteData.data.doctor.isActive === false) {
      console.log('   ✓ Doctor soft-deactivation verified!');
      console.log(`     - Response message: "${deleteData.data.message}"`);
    } else {
      throw new Error('Doctor deletion failed or doctor was hard-deleted: ' + JSON.stringify(deleteData));
    }

    console.log('\n=== ALL API WORKFLOW TESTS COMPLETED SUCCESSFULLY! ===');
  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error.message);
    process.exit(1);
  }
};

runTests();
