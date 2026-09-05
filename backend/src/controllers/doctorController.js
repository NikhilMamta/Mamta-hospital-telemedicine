import Doctor from '../models/Doctor.js';
import Booking from '../models/Booking.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { deleteImage } from '../config/cloudinary.js';

/**
 * @desc    Get all doctors (Public: active only, Admin: all if authorized)
 * @route   GET /api/doctors
 * @access  Public / Private (Conditional)
 */
export const getDoctors = async (req, res, next) => {
  try {
    let filter = { isActive: true };

    // If request contains authorization, we can verify and allow viewing deactivated doctors
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        if (token) {
          // If token is valid, don't filter out inactive doctors
          filter = {}; 
        }
      } catch (err) {
        // Silent catch, default to active only
      }
    }

    const doctors = await Doctor.find(filter).sort({ name: 1 });
    return sendSuccess(res, doctors);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get doctor by ID
 * @route   GET /api/doctors/:id
 * @access  Public / Private (Conditional)
 */
export const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return sendError(res, 'Doctor not found', 404);
    }

    // Public request cannot view inactive doctor
    if (!doctor.isActive && !req.headers.authorization) {
      return sendError(res, 'Doctor not found or inactive', 404);
    }

    return sendSuccess(res, doctor);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a doctor
 * @route   POST /api/doctors
 * @access  Private (Admin)
 */
export const createDoctor = async (req, res, next) => {
  const {
    name,
    email,
    phone,
    specialization,
    qualification,
    experience,
    bio,
    profileImage,
    consultationFee,
    consultationDuration,
    isActive,
  } = req.body;

  try {
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return sendError(res, 'Doctor with this email already exists', 400);
    }

    const doctor = new Doctor({
      name,
      email,
      phone,
      specialization,
      qualification,
      experience,
      bio,
      profileImage,
      consultationFee,
      consultationDuration,
      isActive: isActive !== undefined ? isActive : true,
    });

    await doctor.save();
    return sendSuccess(res, doctor, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a doctor
 * @route   PUT /api/doctors/:id
 * @access  Private (Admin)
 */
export const updateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return sendError(res, 'Doctor not found', 404);
    }

    // Capture old image publicId before update for cleanup
    const oldProfileImage = doctor.profileImage;
    const oldPublicId =
      oldProfileImage && typeof oldProfileImage === 'object'
        ? oldProfileImage.publicId
        : null;

    // List of keys to update
    const updateKeys = [
      'name',
      'email',
      'phone',
      'specialization',
      'qualification',
      'experience',
      'bio',
      'profileImage',
      'consultationFee',
      'consultationDuration',
      'isActive',
      'calcomEventTypeId',
    ];

    updateKeys.forEach((key) => {
      if (req.body[key] !== undefined) {
        doctor[key] = req.body[key];
      }
    });

    await doctor.save();

    // Clean up old Cloudinary image if it was replaced with a new one
    const newProfileImage = doctor.profileImage;
    const newPublicId =
      newProfileImage && typeof newProfileImage === 'object'
        ? newProfileImage.publicId
        : null;

    if (oldPublicId && oldPublicId !== newPublicId) {
      // Fire-and-forget: don't fail update if cleanup fails
      deleteImage(oldPublicId).catch((err) =>
        console.error('Failed to clean up old Cloudinary image:', err.message)
      );
    }

    return sendSuccess(res, doctor);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a doctor (Hard delete if no bookings exist, soft delete if bookings exist)
 * @route   DELETE /api/doctors/:id
 * @access  Private (Admin)
 */
export const deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return sendError(res, 'Doctor not found', 404);
    }

    // Check if bookings exist for this doctor
    const bookingsCount = await Booking.countDocuments({ doctorId: doctor._id });

    if (bookingsCount > 0) {
      // Soft deletion because bookings exist
      doctor.isActive = false;
      await doctor.save();
      return sendSuccess(res, {
        message: 'Doctor deactivated (soft deleted) because related bookings exist in the database.',
        doctor,
      });
    } else {
      // Attempt Cloudinary image cleanup before hard delete
      const profileImage = doctor.profileImage;
      const publicId =
        profileImage && typeof profileImage === 'object'
          ? profileImage.publicId
          : null;

      // Hard delete from database
      await Doctor.findByIdAndDelete(req.params.id);

      // Clean up Cloudinary asset after successful DB deletion
      if (publicId) {
        deleteImage(publicId).catch((err) =>
          console.error('Failed to clean up Cloudinary image on doctor delete:', err.message)
        );
      }

      return sendSuccess(res, {
        message: 'Doctor deleted permanently from database (no existing bookings found).',
      });
    }
  } catch (error) {
    next(error);
  }
};
