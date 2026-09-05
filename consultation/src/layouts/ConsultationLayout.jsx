import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const ConsultationLayout = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Determine current step index based on URL route path
  let currentStep = 1;
  if (path.includes('/schedule')) {
    currentStep = 2;
  } else if (path.includes('/patient-details')) {
    currentStep = 3;
  } else if (path.includes('/review')) {
    currentStep = 4;
  } else if (path.includes('/confirmation')) {
    currentStep = 5;
  }

  const steps = [
    { num: 1, label: 'Select Doctor' },
    { num: 2, label: 'Date & Time' },
    { num: 3, label: 'Patient Info' },
    { num: 4, label: 'Review & Pay' },
    { num: 5, label: 'Confirmed' },
  ];

  const navItems = [
    { label: 'Home', href: 'https://mamtasuperspecialityhospital.com/' },
    { label: 'About', href: 'https://mamtasuperspecialityhospital.com/about-us-page' },
    { label: 'Services', href: 'https://mamtasuperspecialityhospital.com/services' },
    { label: 'Doctors', href: 'https://mamtasuperspecialityhospital.com/doctors' },
    { label: 'Contact', href: 'https://mamtasuperspecialityhospital.com/contact' },
    { label: 'Gallery', href: 'https://mamtasuperspecialityhospital.com/gallery' },
    { label: 'Career', href: 'https://mamtasuperspecialityhospital.com/career' },
    { label: 'Blog', href: 'https://mamtasuperspecialityhospital.com/blogs' },
  ];

  return (
    <div className="app-container">
      {/* Top Ticker Marquee Bar */}
      <div className="top-ticker-bar">
        <div className="ticker-track">
          <div className="ticker-content">
            Mamta Superspeciality Hospita, Raipur's Most trusted Hospistal. &nbsp;•&nbsp;&nbsp;
            Mamta Superspeciality Hospita, Raipur's Most trusted Hospistal. &nbsp;•&nbsp;&nbsp;
            Mamta Superspeciality Hospita, Raipur's Most trusted Hospistal. &nbsp;•&nbsp;&nbsp;
            Mamta Superspeciality Hospita, Raipur's Most trusted Hospistal. &nbsp;•&nbsp;&nbsp;
          </div>
          <div className="ticker-content" aria-hidden="true">
            Mamta Superspeciality Hospita, Raipur's Most trusted Hospistal. &nbsp;•&nbsp;&nbsp;
            Mamta Superspeciality Hospita, Raipur's Most trusted Hospistal. &nbsp;•&nbsp;&nbsp;
            Mamta Superspeciality Hospita, Raipur's Most trusted Hospistal. &nbsp;•&nbsp;&nbsp;
            Mamta Superspeciality Hospita, Raipur's Most trusted Hospistal. &nbsp;•&nbsp;&nbsp;
          </div>
        </div>
      </div>

      {/* Secondary Emergency Contact Bar */}
      <div className="top-emergency-bar">
        <div className="emergency-container">
          <div className="emergency-col emergency-badge">
            24/7 EMERGENCY
          </div>
          <div className="emergency-divider"></div>
          <div className="emergency-col emergency-contact">
            Emergency :+91 7714000455
          </div>
          <div className="emergency-divider"></div>
          <div className="emergency-col ambulance-contact">
            Ambulance:+91 92853-55676
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="main-navbar">
        <div className="navbar-container">
          <a href="/video-consultation" className="navbar-brand">
            <img 
              src="/logo-header.png" 
              alt="Mamta Superspeciality Hospital Logo" 
              className="navbar-logo-img"
            />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav">
            <ul className="navbar-links">
              {navItems.map((item, idx) => (
                <li key={idx}>
                  <a 
                    href={item.href} 
                    className="navbar-link"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right Action */}
          <div className="navbar-action-area">
            <button 
              className="book-appointment-btn"
              onClick={() => window.location.href='/video-consultation'}
            >
              Book Appointment
            </button>
            <button 
              className="mobile-hamburger-btn" 
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-drawer-overlay animate-fade-in" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <div className={`mobile-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <img 
            src="/logo-header.png" 
            alt="MSH Logo" 
            style={{ height: '42px', width: 'auto' }} 
          />
          <button 
            className="mobile-menu-close-btn" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close Navigation Menu"
          >
            <X size={24} />
          </button>
        </div>
        <ul className="mobile-nav-links">
          {navItems.map((item, idx) => (
            <li key={idx}>
              <a 
                href={item.href} 
                className="mobile-nav-link-item"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <button 
          className="book-appointment-btn" 
          style={{ width: '100%', marginTop: 'auto', textAlign: 'center' }}
          onClick={() => {
            setIsMobileMenuOpen(false);
            window.location.href='/video-consultation';
          }}
        >
          Book Appointment
        </button>
      </div>

      <main className="main-content">
        {/* Progress stepper */}
        <div className="stepper">
          {steps.map((step) => {
            let stepClass = 'stepper-step';
            if (currentStep === step.num) {
              stepClass += ' active';
            } else if (currentStep > step.num) {
              stepClass += ' completed';
            }

            return (
              <div className={stepClass} key={step.num}>
                <div className="step-bubble">
                  {currentStep > step.num ? '✓' : step.num}
                </div>
                <div className="step-label">{step.label}</div>
              </div>
            );
          })}
        </div>

        {children}
      </main>
    </div>
  );
};

export default ConsultationLayout;

