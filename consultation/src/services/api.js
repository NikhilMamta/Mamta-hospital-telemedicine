import axios from 'axios';

// Base URL configuration for the API client, using the Vite environment variable with production fallback
const DEFAULT_API_URL = 'https://mamta-hospital-telemedicine.onrender.com/api';
const rawApiUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
const cleanBaseUrl = rawApiUrl.replace(/\/+$/, '');
const API_URL = cleanBaseUrl.endsWith('/api') ? cleanBaseUrl : `${cleanBaseUrl}/api`;

console.log(`[API Config] Base URL set to: ${API_URL}`);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout for Render free-tier cold starts
});

export const getDoctors = async () => {
  try {
    const res = await api.get('/doctors');
    return res;
  } catch (err) {
    console.error('[API Error] GET /doctors failed:', {
      url: `${API_URL}/doctors`,
      status: err.response?.status,
      message: err.message,
      data: err.response?.data,
    });
    throw err;
  }
};

export const getDoctorSlots = async (doctorId, date) => {
  try {
    const res = await api.get(`/doctors/${doctorId}/slots`, {
      params: { date },
    });
    return res;
  } catch (err) {
    console.error(`[API Error] GET /doctors/${doctorId}/slots failed:`, {
      url: `${API_URL}/doctors/${doctorId}/slots`,
      status: err.response?.status,
      message: err.message,
      data: err.response?.data,
    });
    throw err;
  }
};

export const createBooking = async (bookingData) => {
  try {
    const res = await api.post('/bookings', bookingData);
    return res;
  } catch (err) {
    console.error('[API Error] POST /bookings failed:', {
      url: `${API_URL}/bookings`,
      status: err.response?.status,
      message: err.message,
      data: err.response?.data,
    });
    throw err;
  }
};

export const verifyPayment = async (paymentData) => {
  try {
    const res = await api.post('/payments/verify', paymentData);
    return res;
  } catch (err) {
    console.error('[API Error] POST /payments/verify failed:', err);
    throw err;
  }
};

export default {
  getDoctors,
  getDoctorSlots,
  createBooking,
  verifyPayment,
};

