import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Patient email is required'],
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: [true, 'Patient phone number is required'],
    trim: true,
  },
  age: {
    type: Number,
    required: [true, 'Patient age is required'],
    min: [0, 'Age cannot be negative'],
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Patient gender is required'],
  },
  reason: {
    type: String,
    trim: true,
  },
}, { _id: false });

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
      index: true,
    },
    patient: {
      type: patientSchema,
      required: true,
    },
    date: {
      type: Date, // Stored as UTC date representing the day (e.g. YYYY-MM-DDT00:00:00.000Z)
      required: [true, 'Booking date is required'],
      index: true,
    },
    startTime: {
      type: String, // HH:mm
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String, // HH:mm
      required: [true, 'End time is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    bookingStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'meeting_pending', 'cancelled', 'completed', 'no_show'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    razorpayOrderId: {
      type: String,
      default: '',
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    googleCalendarEventId: {
      type: String,
      default: '',
      index: true,
    },
    googleMeetUrl: {
      type: String,
      default: '',
    },
    googleEventId: {
      type: String,
      default: '',
    },
    googleMeetLink: {
      type: String,
      default: '',
    },
    emailStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },
    emailSentAt: {
      type: Date,
    },
    emailError: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compounding indexes or helper indexes for double-booking checks
bookingSchema.index({ doctorId: 1, date: 1, bookingStatus: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
