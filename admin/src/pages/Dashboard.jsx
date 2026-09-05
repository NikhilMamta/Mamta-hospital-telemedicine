import React, { useEffect, useState } from 'react';
import api from '../services/api.js';
import { 
  Calendar, 
  CheckCircle, 
  DollarSign, 
  Hourglass, 
  Users, 
  Video,
  ExternalLink
} from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    todayConsultations: 0,
    upcomingConsultations: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    pendingPayments: 0,
    revenue: 0,
  });
  const [todayList, setTodayList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/bookings');
        
        if (res.data && res.data.success) {
          const bookings = res.data.data;
          
          // Determine current date in IST
          const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          const todayStr = nowIST.toISOString().split('T')[0]; // YYYY-MM-DD
          
          let todayCount = 0;
          let upcomingCount = 0;
          let confirmedCount = 0;
          let pendingPaymentCount = 0;
          let totalRevenue = 0;
          const todayBookings = [];

          bookings.forEach(booking => {
            const bookingDateStr = new Date(booking.date).toISOString().split('T')[0];
            
            // Check if booking is today
            if (bookingDateStr === todayStr) {
              todayCount++;
              todayBookings.push(booking);
            } 
            // Check if booking is in the future
            else if (bookingDateStr > todayStr && booking.bookingStatus !== 'cancelled') {
              upcomingCount++;
            }

            if (booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'completed') {
              confirmedCount++;
            }

            if (booking.paymentStatus === 'pending') {
              pendingPaymentCount++;
            }

            if (booking.paymentStatus === 'paid') {
              totalRevenue += booking.amount;
            }
          });

          setStats({
            todayConsultations: todayCount,
            upcomingConsultations: upcomingCount,
            totalBookings: bookings.length,
            confirmedBookings: confirmedCount,
            pendingPayments: pendingPaymentCount,
            revenue: totalRevenue,
          });

          setTodayList(todayBookings.slice(0, 5));
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Could not retrieve dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="page-header-row">
        <div>
          <h2>Dashboard Overview</h2>
          <p className="page-subtitle">Key metrics and today's schedule at a glance</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Analytics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Bookings</p>
            <h3 className="stat-value">{stats.totalBookings}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Confirmed</p>
            <h3 className="stat-value">{stats.confirmedBookings}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper orange">
            <Hourglass size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Pending Payments</p>
            <h3 className="stat-value">{stats.pendingPayments}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper teal">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Revenue</p>
            <h3 className="stat-value">₹{stats.revenue.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '24px' }}>
        <div className="stat-card mini">
          <div className="stat-icon-wrapper red">
            <Video size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Today's Consultations</p>
            <h3 className="stat-value">{stats.todayConsultations}</h3>
          </div>
        </div>

        <div className="stat-card mini">
          <div className="stat-icon-wrapper purple">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Upcoming (Future Days)</p>
            <h3 className="stat-value">{stats.upcomingConsultations}</h3>
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="dashboard-content-row">
        <div className="content-card">
          <div className="content-card-header">
            <h3>Today's Consultation Schedule</h3>
          </div>
          
          {todayList.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} className="empty-icon" />
              <p>No consultations scheduled for today.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Time Slot</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Meet Link</th>
                  </tr>
                </thead>
                <tbody>
                  {todayList.map((booking) => (
                    <tr key={booking._id}>
                      <td className="bold">{booking.bookingId}</td>
                      <td>
                        <div className="patient-cell">
                          <p className="name">{booking.patient.name}</p>
                          <p className="sub">{booking.patient.phone}</p>
                        </div>
                      </td>
                      <td>{booking.doctorId?.name || 'Unassigned'}</td>
                      <td>
                        <span className="badge badge-light">
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${booking.paymentStatus === 'paid' ? 'success' : 'warning'}`}>
                          {booking.paymentStatus.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${booking.bookingStatus === 'confirmed' ? 'success' : booking.bookingStatus === 'cancelled' ? 'error' : 'info'}`}>
                          {booking.bookingStatus.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {booking.googleMeetLink ? (
                          <a 
                            href={booking.googleMeetLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn-link"
                          >
                            Join <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-muted">Not Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
