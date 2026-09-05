import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { getDoctorSlots } from '../services/api';
import { Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle, Stethoscope } from 'lucide-react';

/**
 * Helper: Extract displayable image URL from profileImage field.
 * Supports both legacy string format and new { url, publicId } object.
 */
const getProfileImageUrl = (profileImage) => {
  if (!profileImage) return '';
  if (typeof profileImage === 'object' && profileImage.url) return profileImage.url;
  if (typeof profileImage === 'string') return profileImage;
  return '';
};

const ScheduleSelection = () => {
  const navigate = useNavigate();
  const { selectedDoctor, selectedDate, setSelectedDate, selectedSlot, setSelectedSlot } = useBooking();

  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState(false);
  const [datesList, setDatesList] = useState([]);

  // Route Guard: Redirect back if no doctor is selected
  useEffect(() => {
    if (!selectedDoctor) {
      navigate('/video-consultation');
      return;
    }

    // Generate next 14 days in IST timezone representation
    const dates = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Get current time in IST
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    for (let i = 0; i < 14; i++) {
      const tempDate = new Date(nowIST.getTime());
      tempDate.setDate(nowIST.getDate() + i);

      const year = tempDate.getFullYear();
      const monthNum = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(tempDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${monthNum}-${dayNum}`; // YYYY-MM-DD

      dates.push({
        dateString: dateStr,
        dayName: daysOfWeek[tempDate.getDay()],
        dayNum: tempDate.getDate(),
        monthName: months[tempDate.getMonth()],
      });
    }

    setDatesList(dates);

    // Default to the first date if none is selected
    if (!selectedDate) {
      setSelectedDate(dates[0].dateString);
    }
  }, [selectedDoctor, navigate, setSelectedDate, selectedDate]);

  // Fetch slots whenever selectedDate or selectedDoctor changes
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setErrorSlots(false);
        setSlots([]);

        const res = await getDoctorSlots(selectedDoctor._id, selectedDate);
        if (res.data && res.data.success) {
          setSlots(res.data.data.slots || []);
        } else {
          setErrorSlots(true);
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
        setErrorSlots(true);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  // Handle date change: reset selected slot when changing date
  const handleDateChange = (dateString) => {
    setSelectedDate(dateString);
    setSelectedSlot(null);
  };

  const handleSelectSlot = (slot) => {
    if (!slot.available) return;
    setSelectedSlot(slot);
  };

  const handleBack = () => {
    navigate('/video-consultation');
  };

  const handleContinue = () => {
    if (!selectedSlot) return;
    navigate('/video-consultation/patient-details');
  };

  const formatTime = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours12}:${minutesStr} ${ampm}`;
  };

  const formatSelectedDateFull = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (!selectedDoctor) return null;

  return (
    <div className="schedule-page animate-fade-in">
      <div className="page-intro">
        <h1 className="page-title">Select Date & Time</h1>
        <p className="page-description">Choose a convenient date and time slot for your video consultation.</p>
      </div>

      <div className="schedule-container">
        {/* Sidebar Summary Card */}
        <div className="sidebar-card">
          <h3 className="section-title">Selected Doctor</h3>
          <div className="doctor-card-header" style={{ marginBottom: '0px' }}>
            <div className="doctor-image-wrapper" style={{ width: '60px', height: '60px' }}>
              {getProfileImageUrl(selectedDoctor.profileImage) ? (
                <img src={getProfileImageUrl(selectedDoctor.profileImage)} alt={selectedDoctor.name} className="doctor-image" />
              ) : (
                <Stethoscope size={24} className="doctor-placeholder-icon" />
              )}
            </div>
            <div className="doctor-header-info">
              <h4 className="doctor-name" style={{ fontSize: '16px' }}>{selectedDoctor.name}</h4>
              <span className="doctor-specialty" style={{ fontSize: '12px' }}>{selectedDoctor.specialization}</span>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Duration:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{selectedDoctor.consultationDuration} Mins</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Consultation Fee:</span>
              <strong style={{ color: 'var(--primary-color)' }}>₹{selectedDoctor.consultationFee}</strong>
            </div>
          </div>
        </div>

        {/* Main Schedule Content */}
        <div className="schedule-main">
          {/* Step 1: Select Date */}
          <div>
            <h3 className="section-title">
              <Calendar size={18} className="logo-icon" />
              <span>Select Date</span>
            </h3>
            <div className="date-picker-scroll">
              {datesList.map((dt) => (
                <div
                  key={dt.dateString}
                  className={`date-card ${selectedDate === dt.dateString ? 'selected' : ''}`}
                  onClick={() => handleDateChange(dt.dateString)}
                >
                  <span className="date-day-name">{dt.dayName}</span>
                  <span className="date-day-num">{dt.dayNum}</span>
                  <span className="date-month-name">{dt.monthName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Select Time */}
          <div className="slots-section">
            <h3 className="section-title">
              <Clock size={18} className="logo-icon" />
              <span>Available Time Slots ({formatSelectedDateFull(selectedDate)})</span>
            </h3>

            {loadingSlots ? (
              <div className="skeleton-slots-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                  <div className="skeleton-item skeleton-slot" key={item}></div>
                ))}
              </div>
            ) : errorSlots ? (
              <div className="error-state" style={{ minHeight: 'auto', padding: '20px' }}>
                <AlertCircle size={24} className="error-icon" />
                <p className="error-desc" style={{ fontSize: '14px', marginBottom: '0px' }}>
                  Unable to check slots. Please try switching dates or click another date to refresh.
                </p>
              </div>
            ) : slots.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 'auto', padding: '32px 16px' }}>
                <p style={{ fontSize: '14px', fontWeight: '500' }}>No consultation slots available for this date.</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Please try selecting another date from the calendar bar above.
                </p>
              </div>
            ) : (
              <div className="slots-grid">
                {slots.map((slot, index) => {
                  const isSelected = selectedSlot && selectedSlot.startTime === slot.startTime;
                  return (
                    <button
                      key={index}
                      className={`slot-button ${isSelected ? 'selected' : ''}`}
                      disabled={!slot.available}
                      onClick={() => handleSelectSlot(slot)}
                      type="button"
                    >
                      {formatTime(slot.startTime)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flow-actions">
        <button className="btn btn-secondary" onClick={handleBack}>
          <ChevronLeft size={16} />
          <span>Back to Doctors</span>
        </button>
        <button
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={!selectedSlot}
        >
          <span>Continue</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default ScheduleSelection;
