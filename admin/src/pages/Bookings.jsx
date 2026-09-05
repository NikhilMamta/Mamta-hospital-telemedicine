import React, { useEffect, useState } from 'react';
import api from '../services/api.js';
import { 
  FileText, 
  Search, 
  Calendar, 
  User, 
  Video, 
  ExternalLink, 
  X, 
  Info,
  CheckCircle,
  HelpCircle,
  Copy,
  Mail
} from 'lucide-react';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters State
  const [filterDate, setFilterDate] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [modalStatus, setModalStatus] = useState('');
  const [modalPayment, setModalPayment] = useState('');
  const [modalPaymentId, setModalPaymentId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [retryingCalcom, setRetryingCalcom] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const fetchFiltersData = async () => {
    try {
      const res = await api.get('/doctors');
      if (res.data && res.data.success) {
        setDoctors(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching doctors for filters:', err);
    }
  };

  const fetchBookingsList = async () => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams();
      if (filterDate) queryParams.append('date', filterDate);
      if (filterDoctor) queryParams.append('doctorId', filterDoctor);
      if (filterStatus) queryParams.append('bookingStatus', filterStatus);
      if (filterPayment) queryParams.append('paymentStatus', filterPayment);

      const res = await api.get(`/admin/bookings?${queryParams.toString()}`);
      if (res.data && res.data.success) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch bookings list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchBookingsList();
  }, [filterDate, filterDoctor, filterStatus, filterPayment]);

  const handleOpenDetails = (booking) => {
    setSelectedBooking(booking);
    setModalStatus(booking.bookingStatus);
    setModalPayment(booking.paymentStatus);
    setModalPaymentId(booking.razorpayPaymentId || '');
  };

  const handleUpdateBooking = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.put(`/admin/bookings/${selectedBooking._id}`, {
        bookingStatus: modalStatus,
        paymentStatus: modalPayment,
        razorpayPaymentId: modalPaymentId,
      });

      if (res.data && res.data.success) {
        setSuccess(`Booking ${res.data.data.bookingId} updated successfully.`);
        fetchBookingsList();
        setSelectedBooking(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update booking status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleResendConfirmationEmail = async () => {
    if (!selectedBooking) return;
    setResendingEmail(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post(`/admin/bookings/${selectedBooking._id}/resend-confirmation`);
      if (res.data && res.data.success) {
        setSuccess(`Confirmation email sent successfully to ${selectedBooking.patient.email}`);
        setSelectedBooking(res.data.data.booking);
        fetchBookingsList();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to resend confirmation email.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleRetryCalcom = async () => {
    if (!selectedBooking) return;
    setRetryingCalcom(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post(`/admin/bookings/${selectedBooking._id}/retry-calcom`);
      if (res.data && res.data.success) {
        setSuccess(`Cal.com booking ${res.data.data.booking?.calcomBookingUid ? 'created' : 'retried'} successfully.`);
        setSelectedBooking(res.data.data.booking);
        fetchBookingsList();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to retry Cal.com booking.');
    } finally {
      setRetryingCalcom(false);
    }
  };

  const handleClearFilters = () => {
    setFilterDate('');
    setFilterDoctor('');
    setFilterStatus('');
    setFilterPayment('');
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    alert('Google Meet link copied to clipboard!');
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading bookings records...</p>
      </div>
    );
  }

  return (
    <div className="bookings-page animate-fade-in">
      <div className="page-header-row">
        <div>
          <h2>Manage Bookings</h2>
          <p className="page-subtitle">Track, verify, and update patient consultations schedules</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filtering Bar */}
      <div className="content-card filter-card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div className="filter-row">
          <div className="filter-col">
            <label htmlFor="filterDate">Consultation Date</label>
            <input
              type="date"
              id="filterDate"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="form-control"
            />
          </div>

          <div className="filter-col">
            <label htmlFor="filterDoctor">Doctor</label>
            <select
              id="filterDoctor"
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="form-control"
            >
              <option value="">All Doctors</option>
              {doctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-col">
            <label htmlFor="filterStatus">Booking Status</label>
            <select
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-control"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="calcom_pending">Cal.com Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          <div className="filter-col">
            <label htmlFor="filterPayment">Payment Status</label>
            <select
              id="filterPayment"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="form-control"
            >
              <option value="">All Payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          
          <div className="filter-col-btn">
            <button className="btn btn-secondary" onClick={handleClearFilters}>
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="content-card">
        {bookings.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} className="empty-icon" />
            <p>No bookings match the selected filters criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td className="bold">{booking.bookingId}</td>
                    <td>
                      <div className="patient-cell">
                        <p className="name">{booking.patient.name}</p>
                        <p className="sub">{booking.patient.phone}</p>
                      </div>
                    </td>
                    <td>{booking.doctorId?.name || 'Doctor Not Set'}</td>
                    <td>
                      {new Date(booking.date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC'
                      })}
                    </td>
                    <td>
                      <span className="badge badge-light">
                        {booking.startTime} - {booking.endTime}
                      </span>
                    </td>
                    <td>₹{booking.amount}</td>
                    <td>
                      <span className={`badge badge-${booking.paymentStatus === 'paid' ? 'success' : booking.paymentStatus === 'failed' ? 'error' : 'warning'}`}>
                        {booking.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${booking.bookingStatus === 'confirmed' ? 'success' : booking.bookingStatus === 'cancelled' ? 'error' : booking.bookingStatus === 'completed' ? 'info' : booking.bookingStatus === 'calcom_pending' ? 'warning' : 'warning'}`}>
                        {booking.bookingStatus === 'calcom_pending' ? 'CAL PENDING' : booking.bookingStatus.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${booking.emailStatus === 'sent' ? 'success' : booking.emailStatus === 'failed' ? 'error' : 'warning'}`}>
                        {(booking.emailStatus || 'pending').toUpperCase()}
                      </span>
                    </td>
                    <td className="text-right">
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenDetails(booking)}
                      >
                        <Info size={14} style={{ marginRight: '4px' }} />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="modal-overlay">
          <div className="modal-content large animate-slide-in">
            <div className="modal-header">
              <h3>Booking Details: {selectedBooking.bookingId}</h3>
              <button className="btn-close" onClick={() => setSelectedBooking(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-split">
              {/* Left Column: Details */}
              <div className="details-col">
                <div className="details-section">
                  <h4>Patient Profile</h4>
                  <div className="details-grid">
                    <div>
                      <p className="label">Name</p>
                      <p className="val">{selectedBooking.patient.name}</p>
                    </div>
                    <div>
                      <p className="label">Age / Gender</p>
                      <p className="val">{selectedBooking.patient.age} / {selectedBooking.patient.gender.toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="label">Email Address</p>
                      <p className="val">{selectedBooking.patient.email}</p>
                    </div>
                    <div>
                      <p className="label">Phone Number</p>
                      <p className="val">{selectedBooking.patient.phone}</p>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <p className="label">Reason for Consultation</p>
                      <p className="val paragraph">{selectedBooking.patient.reason || 'Not Specified'}</p>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h4>Consultation Details</h4>
                  <div className="details-grid">
                    <div>
                      <p className="label">Doctor</p>
                      <p className="val">Dr. {selectedBooking.doctorId?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="label">Specialization</p>
                      <p className="val">{selectedBooking.doctorId?.specialization || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="label">Date</p>
                      <p className="val">
                        {new Date(selectedBooking.date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          timeZone: 'UTC'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="label">Time Interval</p>
                      <p className="val">{selectedBooking.startTime} - {selectedBooking.endTime} (Asia/Kolkata)</p>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h4>Video Consultation &amp; Calendar</h4>
                  <div className="details-link-box">
                    <Video size={20} className="icon" />
                    <div className="box-content">
                      <p className="title">Google Meet Link</p>
                      {selectedBooking.googleMeetLink ? (
                        <div className="link-wrapper">
                          <span className="link">{selectedBooking.googleMeetLink}</span>
                          <button className="btn-icon-mini" onClick={() => handleCopyLink(selectedBooking.googleMeetLink)} title="Copy Link"><Copy size={12} /></button>
                          <a href={selectedBooking.googleMeetLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-xs">Open Meeting <ExternalLink size={12} /></a>
                        </div>
                      ) : (
                        <p className="status text-muted">Meet link will be provided by Cal.com after booking is confirmed</p>
                      )}
                    </div>
                  </div>

                  {/* Cal.com booking info */}
                  <div className="details-grid" style={{ marginTop: '12px' }}>
                    <div>
                      <p className="label">Cal.com Booking ID</p>
                      <p className="val">{selectedBooking.calcomBookingId || <span className="text-muted">Not created yet</span>}</p>
                    </div>
                    <div>
                      <p className="label">Cal.com Status</p>
                      <p className="val">
                        {selectedBooking.calcomStatus ? (
                          <span className={`badge badge-${selectedBooking.calcomStatus === 'accepted' || selectedBooking.calcomStatus === 'confirmed' ? 'success' : selectedBooking.calcomStatus === 'cancelled' || selectedBooking.calcomStatus === 'rejected' ? 'error' : 'warning'}`}>
                            {selectedBooking.calcomStatus.toUpperCase()}
                          </span>
                        ) : (
                          <span className="badge badge-warning">NOT CREATED</span>
                        )}
                      </p>
                    </div>
                    {selectedBooking.calcomBookingUid && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <p className="label">Cal.com UID</p>
                        <p className="val" style={{ fontFamily: 'monospace', fontSize: '12px' }}>{selectedBooking.calcomBookingUid}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="details-section">
                  <h4>Booking Status</h4>
                  <div className="details-grid">
                    <div>
                      <p className="label">Payment Status</p>
                      <p className="val">
                        <span className={`badge badge-${selectedBooking.paymentStatus === 'paid' ? 'success' : selectedBooking.paymentStatus === 'failed' ? 'error' : 'warning'}`}>
                          {selectedBooking.paymentStatus.toUpperCase()}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="label">Booking Status</p>
                      <p className="val">
                        <span className={`badge badge-${selectedBooking.bookingStatus === 'confirmed' ? 'success' : selectedBooking.bookingStatus === 'cancelled' ? 'error' : selectedBooking.bookingStatus === 'calcom_pending' ? 'warning' : 'warning'}`}>
                          {selectedBooking.bookingStatus === 'calcom_pending' ? 'CAL PENDING' : selectedBooking.bookingStatus.toUpperCase()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Update status */}
              <div className="actions-col">
                <div className="details-section border-box">
                  <h4>Management Actions</h4>
                  
                  <form onSubmit={handleUpdateBooking} className="modal-form compact">
                    <div className="form-group">
                      <label htmlFor="modalStatus">Consultation Status</label>
                      <select
                        id="modalStatus"
                        value={modalStatus}
                        onChange={(e) => setModalStatus(e.target.value)}
                        className="form-control"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="modalPayment">Payment Status</label>
                      <select
                        id="modalPayment"
                        value={modalPayment}
                        onChange={(e) => setModalPayment(e.target.value)}
                        className="form-control"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="modalPaymentId">Razorpay Payment ID</label>
                      <input
                        type="text"
                        id="modalPaymentId"
                        value={modalPaymentId}
                        onChange={(e) => setModalPaymentId(e.target.value)}
                        placeholder="pay_xyz123abc"
                        className="form-control"
                      />
                    </div>

                    <div className="payment-summary-block">
                      <div className="sum-row">
                        <span>Consultation Fee:</span>
                        <span className="bold">₹{selectedBooking.amount} INR</span>
                      </div>
                      <div className="sum-row">
                        <span>Order ID:</span>
                        <span className="text-muted text-xs">{selectedBooking.razorpayOrderId || 'Not Generated'}</span>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={updating}>
                      {updating ? 'Saving updates...' : 'Save Management Status'}
                    </button>

                    {/* Retry Cal.com Booking button — shown when calcom not yet created or calcom_pending */}
                    {(!selectedBooking.calcomBookingUid || selectedBooking.bookingStatus === 'calcom_pending') && selectedBooking.paymentStatus === 'paid' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-block"
                        onClick={handleRetryCalcom}
                        disabled={retryingCalcom}
                        style={{ marginTop: '12px' }}
                      >
                        <ExternalLink size={16} style={{ marginRight: '6px' }} />
                        {retryingCalcom ? 'Creating Cal.com Booking...' : 'Retry Cal.com Booking'}
                      </button>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;

