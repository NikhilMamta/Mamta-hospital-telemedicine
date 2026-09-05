import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  LayoutDashboard, 
  Stethoscope, 
  CalendarClock, 
  FileText, 
  Settings as SettingsIcon, 
  LogOut
} from 'lucide-react';

const AdminLayout = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img
            src="/logo-header.png"
            alt="Mamta Superspeciality Hospital"
            className="sidebar-brand-logo"
          />
        </div>
        
        <div className="admin-profile-card">
          <div className="profile-avatar">
            {admin?.name ? admin.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="profile-info">
            <p className="profile-name">{admin?.name || 'Administrator'}</p>
            <p className="profile-role">{(admin?.role || 'admin').replace('_', ' ').toUpperCase()}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink 
            to="/doctors" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Stethoscope size={20} />
            <span>Doctors</span>
          </NavLink>

          <NavLink 
            to="/availability" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <CalendarClock size={20} />
            <span>Availability</span>
          </NavLink>

          <NavLink 
            to="/bookings" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <FileText size={20} />
            <span>Bookings</span>
          </NavLink>

          <NavLink 
            to="/settings" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <SettingsIcon size={20} />
            <span>Settings</span>
          </NavLink>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Panel Content Area */}
      <div className="admin-main-panel">
        <header className="admin-header">
          <div className="header-title-area">
            <h1>Telemedicine Portal</h1>
          </div>
          <div className="header-meta-area">
            <span className="badge badge-success">Live Status</span>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
