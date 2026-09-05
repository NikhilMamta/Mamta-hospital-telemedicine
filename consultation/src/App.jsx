import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BookingProvider } from './context/BookingContext';
import ConsultationLayout from './layouts/ConsultationLayout';
import DoctorSelection from './pages/DoctorSelection';
import ScheduleSelection from './pages/ScheduleSelection';
import PatientDetails from './pages/PatientDetails';
import ReviewDetails from './pages/ReviewDetails';
import Confirmation from './pages/Confirmation';

function App() {
  return (
    <BookingProvider>
      <BrowserRouter>
        <ConsultationLayout>
          <Routes>
            {/* Redirect root to /video-consultation */}
            <Route path="/" element={<Navigate to="/video-consultation" replace />} />
            
            {/* Patient Booking Flow Routes */}
            <Route path="/video-consultation" element={<DoctorSelection />} />
            <Route path="/video-consultation/schedule" element={<ScheduleSelection />} />
            <Route path="/video-consultation/patient-details" element={<PatientDetails />} />
            <Route path="/video-consultation/review" element={<ReviewDetails />} />
            <Route path="/video-consultation/confirmation" element={<Confirmation />} />
            
            {/* Fallback wildcard redirection */}
            <Route path="*" element={<Navigate to="/video-consultation" replace />} />
          </Routes>
        </ConsultationLayout>
      </BrowserRouter>
    </BookingProvider>
  );
}

export default App;
