import axios from 'axios';

// Base URL configuration for the API client, using the Vite environment variable
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const cleanBaseUrl = rawApiUrl.replace(/\/+$/, '');
const API_URL = cleanBaseUrl.endsWith('/api') ? cleanBaseUrl : `${cleanBaseUrl}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


export const getDoctors = async () => {
  return api.get('/doctors');
};

export const getDoctorSlots = async (doctorId, date) => {
  return api.get(`/doctors/${doctorId}/slots`, {
    params: { date },
  });
};

export const createBooking = async (bookingData) => {
  return api.post('/bookings', bookingData);
};

export default {
  getDoctors,
  getDoctorSlots,
  createBooking,
};
