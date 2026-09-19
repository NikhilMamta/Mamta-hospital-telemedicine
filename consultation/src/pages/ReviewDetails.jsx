import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { createBooking, verifyPayment } from '../services/api';
import { ChevronLeft, CreditCard, AlertCircle, ShoppingBag, User, Calendar, Stethoscope } from 'lucide-react';

const ReviewDetails = () => {
  const navigate = useNavigate();
  const { selectedDoctor, selectedDate, selectedSlot, patientInfo, setLastCreatedBooking } = useBooking();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSlotTaken, setIsSlotTaken] = useState(false);

  // Route Guard: Redirect if required data is missing
  useEffect(() => {
    if (!selectedDoctor || !selectedSlot || !patientInfo.name) {
      navigate('/video-consultation');
    }
  }, [selectedDoctor, selectedSlot, patientInfo, navigate]);

  const handleBack = () => {
    navigate('/video-consultation/patient-details');
  };

  const handleConfirmBooking = async () => {
    try {
      setSubmitting(true);
      setErrorMsg('');
      setIsSlotTaken(false);

      const payload = {
        doctorId: selectedDoctor._id,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        patient: {
          name: patientInfo.name,
          email: patientInfo.email,
          phone: patientInfo.phone,
          age: Number(patientInfo.age),
          gender: patientInfo.gender,
          reason: patientInfo.reason,
        },
      };

      const res = await createBooking(payload);

      if (res.data && res.data.success) {
        const { booking, razorpayOrder } = res.data.data;
        
        // Payment verification trigger (creates Google Calendar event + sends emails)
        try {
          const verifyRes = await verifyPayment({
            bookingId: booking._id,
            razorpayOrderId: razorpayOrder?.id || 'mock_order_123',
            razorpayPaymentId: 'pay_mock_' + Math.floor(Math.random() * 1000000),
            razorpaySignature: 'mock_signature'
          });
          
          if (verifyRes.data && verifyRes.data.success) {
            setLastCreatedBooking(verifyRes.data.data.booking);
          } else {
            setLastCreatedBooking(booking);
          }
        } catch (verifyErr) {
          console.error('Mock payment verification failed, but booking was created:', verifyErr);
          setLastCreatedBooking(booking);
        }
        
        navigate('/video-consultation/confirmation');
      } else {
        setErrorMsg('An unexpected error occurred. Please try again.');
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      
      const serverMessage = err.response?.data?.message || '';
      
      // Check if slot has become unavailable
      if (
        err.response?.status === 400 && 
        (serverMessage.toLowerCase().includes('already booked') || 
         serverMessage.toLowerCase().includes('invalid') || 
         serverMessage.toLowerCase().includes('past') || 
         serverMessage.toLowerCase().includes('slot'))
      ) {
        setIsSlotTaken(true);
        setErrorMsg('This slot is no longer available. Please select another time.');
      } else {
        setErrorMsg(serverMessage || 'We couldn\'t complete your booking. Please check your network and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours12}:${minutesStr} ${ampm}`;
  };

  const calculateEndTime = (time24, durationMins) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + (durationMins || 30);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    
    const ampm = endHours >= 12 ? 'PM' : 'AM';
    const hours12 = endHours % 12 || 12;
    const minutesStr = endMinutes < 10 ? `0${endMinutes}` : endMinutes;
    return `${hours12}:${minutesStr} ${ampm}`;
  };

  const formatSelectedDateFull = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (!selectedDoctor || !selectedSlot || !patientInfo.name) return null;

  return (
    <div className="review-details-page animate-fade-in">
      <div className="page-intro">
        <h1 className="page-title">Booking Summary</h1>
        <p className="page-description">Please review your consultation details before proceeding to payment.</p>
      </div>

      <div className="review-card">
        {/* Error Alert Display */}
        {errorMsg && (
          <div className="error-state" style={{ minHeight: 'auto', marginBottom: '24px', padding: '16px' }}>
            <AlertCircle size={20} className="error-icon" style={{ marginBottom: '8px' }} />
            <h4 className="error-title" style={{ fontSize: '15px' }}>Booking Failed</h4>
            <p className="error-desc" style={{ fontSize: '13px', marginBottom: isSlotTaken ? '12px' : '0px' }}>
              {errorMsg}
            </p>
            {isSlotTaken && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/video-consultation/schedule')}
              >
                Go back to Schedule
              </button>
            )}
          </div>
        )}

        {/* Section 1: Doctor and Schedule Details */}
        <div className="review-section">
          <h3 className="review-section-title">
            <Calendar size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Consultation Details
          </h3>
          <div className="review-grid">
            <div className="review-item">
              <span className="review-label">Doctor</span>
              <span className="review-value">{selectedDoctor.name}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedDoctor.specialization}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Date</span>
              <span className="review-value">{formatSelectedDateFull(selectedDate)}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Time Slot</span>
              <span className="review-value">
                {formatTime(selectedSlot.startTime)} – {calculateEndTime(selectedSlot.startTime, selectedDoctor.consultationDuration)}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                ({selectedDoctor.consultationDuration} mins slot)
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Patient Details */}
        <div className="review-section">
          <h3 className="review-section-title">
            <User size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Patient Details
          </h3>
          <div className="review-grid">
            <div className="review-item">
              <span className="review-label">Patient Name</span>
              <span className="review-value">{patientInfo.name}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Email Address</span>
              <span className="review-value">{patientInfo.email}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Phone Number</span>
              <span className="review-value">{patientInfo.phone}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Age / Gender</span>
              <span className="review-value">
                {patientInfo.age} years / {patientInfo.gender.charAt(0).toUpperCase() + patientInfo.gender.slice(1)}
              </span>
            </div>
            <div className="review-item" style={{ gridColumn: '1 / -1' }}>
              <span className="review-label">Reason for Consultation</span>
              <span className="review-value" style={{ fontWeight: 'normal', fontSize: '14px', lineHeight: '1.5' }}>
                {patientInfo.reason}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Fee summary and payment box */}
        <div className="review-section" style={{ marginBottom: '0px' }}>
          <h3 className="review-section-title">
            <ShoppingBag size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Billing Information
          </h3>
          <div className="fee-summary-box">
            <span className="fee-summary-label">Consultation Fee</span>
            <span className="fee-summary-val">₹{selectedDoctor.consultationFee}</span>
          </div>
        </div>

        {/* Flow Actions */}
        <div className="flow-actions">
          <button className="btn btn-secondary" onClick={handleBack} disabled={submitting}>
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirmBooking}
            disabled={submitting || isSlotTaken}
          >
            <CreditCard size={16} />
            <span>{submitting ? 'Booking...' : 'Proceed to Payment'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewDetails;
