import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api.js';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  Stethoscope,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Loader
} from 'lucide-react';

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

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null); // null means adding new doctor
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    qualification: '',
    experience: 5,
    bio: '',
    profileImage: '',
    consultationFee: 500,
    consultationDuration: 30,
    isActive: true,
    calcomEventTypeId: '',
  });

  // Drag & Drop Image State
  const [imageFileDetails, setImageFileDetails] = useState(null); // { name, sizeFormatted }
  const [imagePreviewUrl, setImagePreviewUrl] = useState(''); // For displaying preview
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // Cloudinary upload in progress
  const [uploadError, setUploadError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const fileInputRef = useRef(null);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/doctors');
      if (res.data && res.data.success) {
        setDoctors(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch doctors list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleOpenAddModal = () => {
    setEditingDoctor(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialization: '',
      qualification: '',
      experience: 5,
      bio: '',
      profileImage: '',
      consultationFee: 500,
      consultationDuration: 30,
      isActive: true,
      calcomEventTypeId: '',
    });
    setImageFileDetails(null);
    setImagePreviewUrl('');
    setUploadError('');
    setFieldErrors({});
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEditModal = (doctor) => {
    setEditingDoctor(doctor);
    const existingImageUrl = getProfileImageUrl(doctor.profileImage);

    setFormData({
      name: doctor.name || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
      specialization: doctor.specialization || '',
      qualification: doctor.qualification || '',
      experience: doctor.experience !== undefined ? doctor.experience : 5,
      bio: doctor.bio || '',
      profileImage: doctor.profileImage || '',
      consultationFee: doctor.consultationFee !== undefined ? doctor.consultationFee : 500,
      consultationDuration: doctor.consultationDuration || 30,
      isActive: doctor.isActive !== undefined ? doctor.isActive : true,
      calcomEventTypeId: doctor.calcomEventTypeId || '',
    });
    
    if (existingImageUrl) {
      setImagePreviewUrl(existingImageUrl);
      setImageFileDetails({
        name: 'doctor-profile-image',
        sizeFormatted: 'Existing Image',
      });
    } else {
      setImagePreviewUrl('');
      setImageFileDetails(null);
    }

    setUploadError('');
    setFieldErrors({});
    setModalError('');
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
    }));

    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Image Processing & Upload to Cloudinary via Backend (Max 5MB, JPG/PNG/WEBP)
  const processSelectedImage = async (file) => {
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFieldErrors(prev => ({
        ...prev,
        profileImage: 'Unsupported file type. Please upload a JPG, PNG, or WEBP image.'
      }));
      return;
    }

    // Validate size (Max 5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setFieldErrors(prev => ({
        ...prev,
        profileImage: 'File size exceeds 5 MB limit. Please select a smaller image.'
      }));
      return;
    }

    // Format size
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeFormatted = `${sizeInMB} MB`;

    // Show local preview immediately
    const localPreviewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(localPreviewUrl);
    setImageFileDetails({ name: file.name, sizeFormatted });
    setFieldErrors(prev => ({ ...prev, profileImage: '' }));
    setUploadError('');

    // Upload to backend -> Cloudinary
    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const res = await api.post('/uploads/image', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.success) {
        const { url, publicId } = res.data;
        setFormData(prev => ({
          ...prev,
          profileImage: { url, publicId },
        }));
        setImagePreviewUrl(url);
        setImageFileDetails({ name: file.name, sizeFormatted });
        setUploadError('');
      } else {
        throw new Error('Upload response was not successful.');
      }
    } catch (err) {
      console.error('Image upload error:', err);
      const errMsg = err.response?.data?.message || 'Image upload failed. Please try again.';
      setUploadError(errMsg);
      // Clear the preview since upload failed
      setFormData(prev => ({ ...prev, profileImage: '' }));
      setImagePreviewUrl('');
      setImageFileDetails(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedImage(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedImage(e.target.files[0]);
    }
  };

  const handleRemoveImage = (e) => {
    if (e) e.stopPropagation();
    setFormData(prev => ({ ...prev, profileImage: '' }));
    setImagePreviewUrl('');
    setImageFileDetails(null);
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Frontend Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Doctor name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!formData.specialization.trim()) errors.specialization = 'Specialization is required';
    if (!formData.qualification.trim()) errors.qualification = 'Qualification is required';

    if (formData.experience === '' || formData.experience < 0 || isNaN(formData.experience)) {
      errors.experience = 'Experience must be a valid non-negative number';
    }

    if (formData.consultationFee === '' || formData.consultationFee <= 0 || isNaN(formData.consultationFee)) {
      errors.consultationFee = 'Consultation fee must be a positive number';
    }

    if (formData.consultationDuration === '' || formData.consultationDuration <= 0 || isNaN(formData.consultationDuration)) {
      errors.consultationDuration = 'Slot duration must be a positive number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || isUploading) return;

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError('');
    setModalError('');
    setSuccess('');

    try {
      if (editingDoctor) {
        // Edit doctor
        const res = await api.put(`/doctors/${editingDoctor._id}`, formData);
        if (res.data && res.data.success) {
          setSuccess(`Doctor profile for Dr. ${formData.name} updated successfully.`);
          fetchDoctors();
          setShowModal(false);
        }
      } else {
        // Add new doctor
        const res = await api.post('/doctors', formData);
        if (res.data && res.data.success) {
          setSuccess(`Doctor profile for Dr. ${formData.name} created successfully.`);
          fetchDoctors();
          setShowModal(false);
        }
      }
    } catch (err) {
      console.error(err);
      setModalError(err.response?.data?.message || 'Error occurred while saving doctor profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate/delete this doctor profile?')) {
      return;
    }
    
    setError('');
    setSuccess('');

    try {
      const res = await api.delete(`/doctors/${id}`);
      if (res.data && res.data.success) {
        setSuccess(res.data.data?.message || 'Doctor deactivation complete.');
        fetchDoctors();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred during delete request.');
    }
  };

  if (loading && doctors.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading doctors...</p>
      </div>
    );
  }

  return (
    <div className="doctors-page animate-fade-in">
      <div className="page-header-row">
        <div>
          <h2>Manage Doctors</h2>
          <p className="page-subtitle">Add, edit, or configure active medical practitioners</p>
        </div>
        <button className="btn btn-primary btn-with-icon" onClick={handleOpenAddModal}>
          <Plus size={18} />
          <span>Add New Doctor</span>
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="content-card">
        {doctors.length === 0 ? (
          <div className="empty-state">
            <Stethoscope size={48} className="empty-icon" />
            <p>No doctor records found. Click "Add New Doctor" to get started.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Specialization</th>
                  <th>Qualification</th>
                  <th>Experience</th>
                  <th>Fee</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => {
                  const doctorImgUrl = getProfileImageUrl(doctor.profileImage);
                  return (
                    <tr key={doctor._id}>
                      <td>
                        <div className="doctor-cell">
                          <div className="doctor-avatar">
                            {doctorImgUrl ? (
                              <img src={doctorImgUrl} alt={doctor.name} />
                            ) : (
                              doctor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="doctor-details">
                            <p className="name">{doctor.name}</p>
                            <p className="sub">{doctor.email || 'No Email'}</p>
                          </div>
                        </div>
                      </td>
                      <td>{doctor.specialization}</td>
                      <td>{doctor.qualification}</td>
                      <td>{doctor.experience} Years</td>
                      <td className="bold">₹{doctor.consultationFee}</td>
                      <td>
                        <span className="badge badge-light">{doctor.consultationDuration} Mins</span>
                      </td>
                      <td>
                        <span className={`badge badge-${doctor.isActive ? 'success' : 'dark'}`}>
                          {doctor.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-wrapper">
                          <button 
                            className="btn-icon" 
                            onClick={() => handleOpenEditModal(doctor)}
                            title="Edit Details"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="btn-icon delete" 
                            onClick={() => handleDeleteDeactivate(doctor._id)}
                            disabled={!doctor.isActive}
                            title="Deactivate / Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Overlay for Add/Edit Doctor */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-in">
            {/* Fixed Header */}
            <div className="modal-header">
              <h3>{editingDoctor ? 'Edit Doctor Profile' : 'Add New Doctor'}</h3>
              <button 
                className="btn-close" 
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              {/* Scrollable Form Body */}
              <div className="modal-form-body">
                {modalError && (
                  <div className="alert alert-error" style={{ margin: 0 }}>
                    <AlertCircle size={18} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Row 1: Name & Specialization */}
                <div className="form-row">
                  <div className="form-group col-6">
                    <label htmlFor="name">Doctor Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Dr. Rajesh Sharma"
                    />
                    {fieldErrors.name && <span className="field-error-text">{fieldErrors.name}</span>}
                  </div>

                  <div className="form-group col-6">
                    <label htmlFor="specialization">Specialization <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input
                      type="text"
                      id="specialization"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleInputChange}
                      placeholder="Cardiologist"
                    />
                    {fieldErrors.specialization && <span className="field-error-text">{fieldErrors.specialization}</span>}
                  </div>
                </div>

                {/* Row 2: Email & Phone */}
                <div className="form-row">
                  <div className="form-group col-6">
                    <label htmlFor="email">Email <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="doctor@mamtahospital.com"
                    />
                    {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
                  </div>

                  <div className="form-group col-6">
                    <label htmlFor="phone">Phone <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="9876543210"
                    />
                    {fieldErrors.phone && <span className="field-error-text">{fieldErrors.phone}</span>}
                  </div>
                </div>

                {/* Row 3: Qualification & Experience */}
                <div className="form-row">
                  <div className="form-group col-6">
                    <label htmlFor="qualification">Qualification <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input
                      type="text"
                      id="qualification"
                      name="qualification"
                      value={formData.qualification}
                      onChange={handleInputChange}
                      placeholder="MD, MBBS"
                    />
                    {fieldErrors.qualification && <span className="field-error-text">{fieldErrors.qualification}</span>}
                  </div>

                  <div className="form-group col-6">
                    <label htmlFor="experience">Experience (Years) <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input
                      type="number"
                      id="experience"
                      name="experience"
                      min="0"
                      value={formData.experience}
                      onChange={handleInputChange}
                      placeholder="10"
                    />
                    {fieldErrors.experience && <span className="field-error-text">{fieldErrors.experience}</span>}
                  </div>
                </div>

                {/* Row 3: Consultation Fee & Slot Duration */}
                <div className="form-row">
                  <div className="form-group col-6">
                    <label htmlFor="consultationFee">Consultation Fee (₹) <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input
                      type="number"
                      id="consultationFee"
                      name="consultationFee"
                      min="1"
                      value={formData.consultationFee}
                      onChange={handleInputChange}
                      placeholder="500"
                    />
                    {fieldErrors.consultationFee && <span className="field-error-text">{fieldErrors.consultationFee}</span>}
                  </div>

                  <div className="form-group col-6">
                    <label htmlFor="consultationDuration">Slot Duration (Minutes) <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input
                      type="number"
                      id="consultationDuration"
                      name="consultationDuration"
                      min="5"
                      step="5"
                      value={formData.consultationDuration}
                      onChange={handleInputChange}
                      placeholder="30"
                    />
                    {fieldErrors.consultationDuration && <span className="field-error-text">{fieldErrors.consultationDuration}</span>}
                  </div>
                </div>

                {/* Profile Image Drag and Drop Component */}
                <div className="form-group">
                  <label>Profile Image</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                  />

                  {isUploading ? (
                    <div className="image-upload-area" style={{ cursor: 'default', pointerEvents: 'none' }}>
                      <div className="upload-icon-wrapper">
                        <Loader size={22} className="spinning-icon" />
                      </div>
                      <span className="upload-main-text">
                        Uploading image...
                      </span>
                      <span className="upload-sub-text">Please wait</span>
                    </div>
                  ) : imagePreviewUrl ? (
                    <div className="image-preview-card">
                      <div className="preview-left">
                        <img 
                          src={imagePreviewUrl} 
                          alt="Doctor Preview" 
                          className="preview-thumbnail" 
                        />
                        <div className="preview-info">
                          <span className="preview-filename">
                            {imageFileDetails?.name || 'doctor-profile.jpg'}
                          </span>
                          <span className="preview-filesize">
                            {imageFileDetails?.sizeFormatted || 'Uploaded Image'}
                          </span>
                        </div>
                      </div>
                      <div className="preview-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        >
                          <RefreshCw size={14} />
                          <span>Change Image</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleRemoveImage}
                          style={{ color: 'var(--color-error)' }}
                        >
                          <Trash2 size={14} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className={`image-upload-area ${isDragging ? 'dragging' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                      <div className="upload-icon-wrapper">
                        <Upload size={22} />
                      </div>
                      <span className="upload-main-text">
                        Drag & drop doctor image here
                      </span>
                      <span className="upload-sub-text">or</span>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current && fileInputRef.current.click();
                        }}
                      >
                        Choose Image
                      </button>
                      <span className="upload-file-types">
                        JPG, PNG or WEBP • Max 5MB
                      </span>
                    </div>
                  )}
                  {fieldErrors.profileImage && (
                    <span className="field-error-text">{fieldErrors.profileImage}</span>
                  )}
                  {uploadError && (
                    <span className="field-error-text">{uploadError}</span>
                  )}
                </div>

                {/* Professional Bio */}
                <div className="form-group">
                  <label htmlFor="bio">Professional Bio</label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows="3"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Brief description of the doctor's experience, expertise, and achievements."
                  />
                </div>

                {/* Active Checkbox */}
                <div className="form-group checkbox-group" style={{ marginBottom: '12px' }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                    />
                    <span>Active & Available for Booking</span>
                  </label>
                </div>

                {/* Cal.com Event Type ID */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="calcomEventTypeId" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Cal.com Event Type ID
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>(optional — overrides global setting)</span>
                  </label>
                  <input
                    type="number"
                    id="calcomEventTypeId"
                    name="calcomEventTypeId"
                    min="0"
                    value={formData.calcomEventTypeId}
                    onChange={handleInputChange}
                    placeholder="e.g. 12345 (leave blank to use global default)"
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting || isUploading}
                >
                  {submitting ? 'Saving...' : (editingDoctor ? 'Save Changes' : 'Add Doctor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Doctors;
