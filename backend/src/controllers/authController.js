import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { sendSuccess, sendError } from '../utils/response.js';

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * @desc    Authenticate admin & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginAdmin = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    // Find admin and explicitly include password
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }

    // Check if admin is active
    if (!admin.isActive) {
      return sendError(res, 'Admin account is deactivated', 403);
    }

    // Generate JWT
    const token = generateToken(admin._id);

    return sendSuccess(res, {
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current admin profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getAdminProfile = async (req, res, next) => {
  try {
    // req.admin is already attached by authMiddleware.js
    if (!req.admin) {
      return sendError(res, 'Not authorized', 401);
    }

    return sendSuccess(res, {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
      isActive: req.admin.isActive,
    });
  } catch (error) {
    next(error);
  }
};
