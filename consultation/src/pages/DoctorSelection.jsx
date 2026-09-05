import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { getDoctors } from '../services/api';
import { Stethoscope, AlertCircle, RefreshCw, Clock, CreditCard, ShieldCheck, UserCheck, Calendar } from 'lucide-react';

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

const DoctorSelection = () => {
  const navigate = useNavigate();
  const { setSelectedDoctor, resetBooking } = useBooking();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const doctorSectionRef = useRef(null);

  const fetchActiveDoctors = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await getDoctors();
      
      if (res.data && res.data.success) {
        // Only show active doctors
        const active = res.data.data.filter((doc) => doc.isActive);
        setDoctors(active);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset booking state when starting fresh on the doctor selection screen
    resetBooking();
    fetchActiveDoctors();
  }, []);

  const handleSelectDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    navigate('/video-consultation/schedule');
  };

  const handleScrollToDoctors = () => {
    doctorSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Skeleton Loader rendering
  const renderSkeletons = () => {
    return (
      <div className="skeleton-grid">
        {[1, 2, 3].map((item) => (
          <div className="skeleton-card" key={item}>
            <div className="skeleton-header-block">
              <div className="skeleton-item skeleton-circle"></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton-item skeleton-text-title"></div>
                <div className="skeleton-item skeleton-text-sub"></div>
              </div>
            </div>
            <div className="skeleton-item skeleton-text-paragraph"></div>
            <div className="skeleton-details-block">
              <div className="skeleton-item skeleton-detail-item"></div>
              <div className="skeleton-item skeleton-detail-item"></div>
            </div>
            <div className="skeleton-item skeleton-btn"></div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="doctor-selection-page animate-fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <span className="hero-tagline">Video Consultation</span>
        <h1 className="hero-title">
          Consult With Our Specialists<br />
          From The Comfort Of Your Home
        </h1>
        <p className="hero-description">
          Experience world-class healthcare without travel. Connect securely with Raipur's most trusted superspeciality doctors via private, high-definition video consultations.
        </p>
        <button className="btn btn-primary" onClick={handleScrollToDoctors} style={{ padding: '14px 32px', borderRadius: '50px' }}>
          Book Video Consultation
        </button>

        <div className="hero-badges">
          <div className="hero-badge-item">
            <ShieldCheck size={16} className="hero-badge-icon" />
            <span>Secure & Private</span>
          </div>
          <div className="hero-badge-item">
            <Calendar size={16} className="hero-badge-icon" />
            <span>Convenient Scheduling</span>
          </div>
          <div className="hero-badge-item">
            <UserCheck size={16} className="hero-badge-icon" />
            <span>Certified Doctor-led Consultation</span>
          </div>
        </div>
      </section>

      {/* Doctor Grid Section */}
      <div ref={doctorSectionRef} style={{ scrollMarginTop: '100px', paddingTop: '16px' }}>
        <div className="page-intro" style={{ marginBottom: '32px' }}>
          <h2 className="page-title" style={{ fontSize: '28px', color: 'var(--primary-color)' }}>Choose Your Doctor</h2>
          <p className="page-description" style={{ fontSize: '15px' }}>
            Select from our panel of experienced practitioners to schedule your online appointment.
          </p>
        </div>

        {loading ? (
          renderSkeletons()
        ) : error ? (
          <div className="error-state animate-fade-in">
            <AlertCircle size={48} className="error-icon" />
            <h3 className="error-title">Unable to load doctors</h3>
            <p className="error-desc">We couldn't fetch the active list of doctors. Please check your internet connection or try again.</p>
            <button className="btn btn-primary" onClick={fetchActiveDoctors}>
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </div>
        ) : doctors.length === 0 ? (
          <div className="empty-state animate-fade-in">
            <Stethoscope size={48} className="empty-icon" />
            <h3>No doctors available</h3>
            <p>There are no active doctors available for remote video consultation at this moment.</p>
          </div>
        ) : (
          <div className="doctors-grid">
            {doctors.map((doctor) => (
              <div className="doctor-card" key={doctor._id}>
                <div className="doctor-card-header">
                  <div className="doctor-image-wrapper">
                    {getProfileImageUrl(doctor.profileImage) ? (
                      <img
                        src={getProfileImageUrl(doctor.profileImage)}
                        alt={doctor.name}
                        className="doctor-image"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Stethoscope className="doctor-placeholder-icon" size={32} />
                    )}
                  </div>
                  <div className="doctor-header-info">
                    <h3 className="doctor-name" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{doctor.name}</h3>
                    <span className="doctor-specialty">{doctor.specialization}</span>
                    {doctor.qualification && (
                      <span className="doctor-qual">{doctor.qualification}</span>
                    )}
                  </div>
                </div>

                <p className="doctor-bio">
                  {doctor.bio || 'Qualified physician providing dedicated healthcare support and online video consultations.'}
                </p>

                <div className="doctor-details-list">
                  <div className="detail-item">
                    <span className="detail-label">Experience</span>
                    <span className="detail-val">{doctor.experience}+ Years</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Duration</span>
                    <span className="detail-val">
                      <Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: 'var(--accent-color)' }} />
                      {doctor.consultationDuration || 30} mins
                    </span>
                  </div>
                  <div className="detail-item" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="detail-label" style={{ marginBottom: '0px' }}>Consultation Fee</span>
                    <span className="detail-val" style={{ fontSize: '16px', color: 'var(--primary-color)' }}>
                      ₹{doctor.consultationFee}
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-block"
                  style={{ borderRadius: '4px', fontWeight: '600' }}
                  onClick={() => handleSelectDoctor(doctor)}
                >
                  Book Consultation
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorSelection;
