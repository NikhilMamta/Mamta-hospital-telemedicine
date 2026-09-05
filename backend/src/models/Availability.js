import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor reference is required'],
    },
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      lowercase: true,
      required: [true, 'Day of week is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:mm format'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:mm format'],
    },
    slotDuration: {
      type: Number,
      required: [true, 'Slot duration is required'],
      min: [1, 'Slot duration must be at least 1 minute'],
    },
    bufferTime: {
      type: Number,
      default: 0,
      min: [0, 'Buffer time cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookups
availabilitySchema.index({ doctorId: 1, dayOfWeek: 1 });
availabilitySchema.index({ doctorId: 1 });

const Availability = mongoose.model('Availability', availabilitySchema);

export default Availability;
