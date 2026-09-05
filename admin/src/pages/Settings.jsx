import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  User, 
  Key, 
  Settings as SettingsIcon,
  CheckCircle,
  XCircle,
  Database
} from 'lucide-react';

const Settings = () => {
  const { admin } = useAuth();

  // Simulated configuration status flags (checking variables locally or standard flags)
  const configurationStatus = {
    mongodb: true, // If admin dashboard is loaded, MongoDB is connected
    razorpay: !!import.meta.env.VITE_API_URL, // Placeholder check
    googleMeet: !!import.meta.env.VITE_API_URL, // Placeholder check
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="page-header-row">
        <div>
          <h2>System Settings</h2>
          <p className="page-subtitle">Manage administrative profile and view integrations status</p>
        </div>
      </div>

      <div className="settings-grid-layout">
        {/* Left Column: Admin Profile Card */}
        <div className="content-card">
          <div className="content-card-header">
            <h3>
              <User size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Administrator Profile
            </h3>
          </div>
          
          <div className="profile-detail-list">
            <div className="detail-item">
              <span className="label">Name:</span>
              <span className="value bold">{admin?.name || 'Super Admin'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Email Address:</span>
              <span className="value">{admin?.email || 'admin@mamtahospital.com'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Role Assignment:</span>
              <span className="value badge badge-light">
                {(admin?.role || 'super_admin').toUpperCase().replace('_', ' ')}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Status:</span>
              <span className="value badge badge-success">ACTIVE SESSION</span>
            </div>
          </div>
        </div>

        {/* Right Column: Configuration & Keys Status */}
        <div className="content-card">
          <div className="content-card-header">
            <h3>
              <Key size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Integration Settings & Keys
            </h3>
          </div>

          <div className="integration-status-list">
            <div className="integration-item">
              <div className="integration-info">
                <h4>MongoDB Database</h4>
                <p className="sub">Mongoose ORM connection status</p>
              </div>
              <div className="integration-indicator">
                {configurationStatus.mongodb ? (
                  <span className="pill pill-success"><CheckCircle size={14} /> Connected</span>
                ) : (
                  <span className="pill pill-error"><XCircle size={14} /> Disconnected</span>
                )}
              </div>
            </div>

            <div className="integration-item">
              <div className="integration-info">
                <h4>Razorpay Gateway Placeholder</h4>
                <p className="sub">API Client config status (.env keys)</p>
              </div>
              <div className="integration-indicator">
                <span className="pill pill-info">Placeholder Active</span>
              </div>
            </div>

            <div className="integration-item">
              <div className="integration-info">
                <h4>Google Meet & Calendar Placeholder</h4>
                <p className="sub">OAuth credentials status (.env keys)</p>
              </div>
              <div className="integration-indicator">
                <span className="pill pill-info">Placeholder Active</span>
              </div>
            </div>
          </div>

          <div className="settings-info-box alert alert-info" style={{ marginTop: '24px' }}>
            <Database size={20} />
            <div>
              <p className="box-title">Integration Guide</p>
              <p className="box-desc">
                To connect production systems, add Razorpay secrets (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) and Google API credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`) to the backend `.env` file. Do not commit or expose these values to the frontend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
