import React, { createContext, useContext, useState } from 'react';

const BookingContext = createContext(undefined);

export const BookingProvider = ({ children }) => {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    reason: '',
  });
  const [lastCreatedBooking, setLastCreatedBooking] = useState(null);

  const resetBooking = () => {
    setSelectedDoctor(null);
    setSelectedDate('');
    setSelectedSlot(null);
    setPatientInfo({
      name: '',
      email: '',
      phone: '',
      age: '',
      gender: '',
      reason: '',
    });
    setLastCreatedBooking(null);
  };

  return (
    <BookingContext.Provider
      value={{
        selectedDoctor,
        setSelectedDoctor,
        selectedDate,
        setSelectedDate,
        selectedSlot,
        setSelectedSlot,
        patientInfo,
        setPatientInfo,
        lastCreatedBooking,
        setLastCreatedBooking,
        resetBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
