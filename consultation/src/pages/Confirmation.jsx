import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { Check, Calendar, Clock, Video, CreditCard, Stethoscope, RefreshCw, FileText } from 'lucide-react';

const Confirmation = () => {
  const navigate = useNavigate();
  const { lastCreatedBooking, selectedDoctor, selectedDate, selectedSlot, resetBooking } = useBooking();

  // Route Guard: Redirect if no booking was successfully completed
  useEffect(() => {
    if (!lastCreatedBooking) {
      navigate('/video-consultation');
    }
  }, [lastCreatedBooking, navigate]);

  const handleStartNew = () => {
    resetBooking();
    navigate('/video-consultation');
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

  if (!lastCreatedBooking) return null;

  const doctorName = selectedDoctor?.name || 'Your Doctor';
  const doctorSpecialization = selectedDoctor?.specialization || 'Medical Specialist';
  const duration = selectedDoctor?.consultationDuration || 30;

  return (
    <div className="confirmation-page animate-fade-in">
      <div className="confirmation-card">
        {/* Checkmark icon badge */}
        <div className="success-badge-icon">
          <Check size={36} />
        </div>

        <h1 className="confirm-title">Your Consultation Is Confirmed</h1>
        <p className="confirm-subtitle">
          Your video consultation has been booked successfully.
        </p>

        {/* Details Table */}
        <div className="confirm-details-table">
          <div className="confirm-row">
            <span className="confirm-label">Booking ID</span>
            <span className="confirm-val" style={{ fontFamily: 'monospace', fontSize: '15px', color: 'var(--primary-color)' }}>
              {lastCreatedBooking.bookingId}
            </span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Doctor</span>
            <span className="confirm-val">
              {doctorName}
              <span style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                {doctorSpecialization}
              </span>
            </span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Date</span>
            <span className="confirm-val">{formatSelectedDateFull(selectedDate)}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Time</span>
            <span className="confirm-val">
              {formatTime(lastCreatedBooking.startTime)} – {calculateEndTime(lastCreatedBooking.startTime, duration)}
            </span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Consultation Fee</span>
            <span className="confirm-val">₹{lastCreatedBooking.amount}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Payment Status</span>
            <span className="confirm-val" style={{ textTransform: 'uppercase', color: 'var(--color-warning)' }}>
              {lastCreatedBooking.paymentStatus}
            </span>
          </div>
        </div>

        {/* Google Meet Placeholder Box */}
        {lastCreatedBooking.googleMeetLink ? (
          <div className="meet-placeholder-box" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
            <Video className="meet-info-icon" size={20} style={{ color: '#059669' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '4px' }}>Google Meet Link Available</strong>
              <a
                href={lastCreatedBooking.googleMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ marginTop: '8px', textDecoration: 'none' }}
              >
                Join Consultation
              </a>
            </div>
          </div>
        ) : (
          <div className="meet-placeholder-box">
            <Video className="meet-info-icon" size={20} />
            <div>
              <strong>Consultation Booking Confirmed</strong>
              <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Your Google Meet link and appointment confirmation email will be sent by Cal.com shortly. Please check your email at <strong>{lastCreatedBooking?.patient?.email || 'the address you provided'}</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Start New Button */}
        <button className="btn btn-primary" onClick={handleStartNew} style={{ marginTop: '16px' }}>
          <RefreshCw size={16} />
          <span>Book Another Consultation</span>
        </button>
      </div>
    </div>
  );
};

export default Confirmation;
