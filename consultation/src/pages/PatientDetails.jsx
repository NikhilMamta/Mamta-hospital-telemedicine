import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

const PatientDetails = () => {
  const navigate = useNavigate();
  const { selectedDoctor, selectedSlot, patientInfo, setPatientInfo } = useBooking();

  // Local validation error state
  const [errors, setErrors] = useState({});

  // Route Guard: Redirect if doctor or slot is missing
  useEffect(() => {
    if (!selectedDoctor || !selectedSlot) {
      navigate('/video-consultation');
    }
  }, [selectedDoctor, selectedSlot, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPatientInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation error when typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!patientInfo.name || !patientInfo.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!patientInfo.email || !patientInfo.email.trim()) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(patientInfo.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!patientInfo.phone || !patientInfo.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneRegex = /^[0-9+\s-]{8,15}$/;
      if (!phoneRegex.test(patientInfo.phone)) {
        newErrors.phone = 'Please enter a valid phone number (minimum 8 digits)';
      }
    }

    if (!patientInfo.age) {
      newErrors.age = 'Age is required';
    } else {
      const ageNum = Number(patientInfo.age);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
        newErrors.age = 'Please enter a valid age between 0 and 120';
      }
    }

    if (!patientInfo.gender) {
      newErrors.gender = 'Gender is required';
    } else {
      const validGenders = ['male', 'female', 'other'];
      if (!validGenders.includes(patientInfo.gender)) {
        newErrors.gender = 'Please select a valid gender';
      }
    }

    if (!patientInfo.reason || !patientInfo.reason.trim()) {
      newErrors.reason = 'Reason for consultation is required';
    } else if (patientInfo.reason.trim().length < 5) {
      newErrors.reason = 'Please explain in at least 5 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBack = () => {
    navigate('/video-consultation/schedule');
  };

  const handleContinue = (e) => {
    e.preventDefault();
    if (validateForm()) {
      navigate('/video-consultation/review');
    }
  };

  if (!selectedDoctor || !selectedSlot) return null;

  return (
    <div className="patient-details-page animate-fade-in">
      <div className="page-intro">
        <h1 className="page-title">Patient Information</h1>
        <p className="page-description">
          Please provide details of the patient who will be attending the remote video consultation.
        </p>
      </div>

      <div className="form-card">
        <form onSubmit={handleContinue} className="patient-form" noValidate>
          <div className="form-grid">
            {/* Full Name */}
            <div className="form-group full-width">
              <label htmlFor="name" className="form-label">
                <span>Full Name</span>
                <span className="required-star">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className={`form-control ${errors.name ? 'error' : ''}`}
                placeholder="Enter patient's full name"
                value={patientInfo.name}
                onChange={handleChange}
                required
              />
              {errors.name && (
                <span className="form-error-msg">
                  <AlertCircle size={14} />
                  {errors.name}
                </span>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <span>Email Address</span>
                <span className="required-star">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className={`form-control ${errors.email ? 'error' : ''}`}
                placeholder="patient@example.com"
                value={patientInfo.email}
                onChange={handleChange}
                required
              />
              {errors.email && (
                <span className="form-error-msg">
                  <AlertCircle size={14} />
                  {errors.email}
                </span>
              )}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                <span>Phone Number</span>
                <span className="required-star">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className={`form-control ${errors.phone ? 'error' : ''}`}
                placeholder="e.g. 9876543210"
                value={patientInfo.phone}
                onChange={handleChange}
                required
              />
              {errors.phone && (
                <span className="form-error-msg">
                  <AlertCircle size={14} />
                  {errors.phone}
                </span>
              )}
            </div>

            {/* Age */}
            <div className="form-group">
              <label htmlFor="age" className="form-label">
                <span>Age</span>
                <span className="required-star">*</span>
              </label>
              <input
                type="number"
                id="age"
                name="age"
                min="0"
                max="120"
                className={`form-control ${errors.age ? 'error' : ''}`}
                placeholder="e.g. 35"
                value={patientInfo.age}
                onChange={handleChange}
                required
              />
              {errors.age && (
                <span className="form-error-msg">
                  <AlertCircle size={14} />
                  {errors.age}
                </span>
              )}
            </div>

            {/* Gender */}
            <div className="form-group">
              <label htmlFor="gender" className="form-label">
                <span>Gender</span>
                <span className="required-star">*</span>
              </label>
              <div className="gender-select-wrapper">
                <select
                  id="gender"
                  name="gender"
                  className={`form-control ${errors.gender ? 'error' : ''}`}
                  value={patientInfo.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {errors.gender && (
                <span className="form-error-msg">
                  <AlertCircle size={14} />
                  {errors.gender}
                </span>
              )}
            </div>

            {/* Reason */}
            <div className="form-group full-width">
              <label htmlFor="reason" className="form-label">
                <span>Reason for Consultation</span>
                <span className="required-star">*</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                className={`form-control ${errors.reason ? 'error' : ''}`}
                placeholder="Briefly describe your symptoms or reason for consulting the doctor (e.g. fever for 2 days, back pain)..."
                value={patientInfo.reason}
                onChange={handleChange}
                required
              />
              {errors.reason && (
                <span className="form-error-msg">
                  <AlertCircle size={14} />
                  {errors.reason}
                </span>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flow-actions">
            <button type="button" className="btn btn-secondary" onClick={handleBack}>
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
            <button type="submit" className="btn btn-primary">
              <span>Review Details</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientDetails;
