import express from 'express';
import { protectAdmin } from '../middleware/authMiddleware.js';
import { uploadSingleImage } from '../middleware/uploadMiddleware.js';
import { uploadImageStream } from '../config/cloudinary.js';

const router = express.Router();

/**
 * @desc    Upload a single image to Cloudinary
 * @route   POST /api/uploads/image
 * @access  Private (Admin)
 */
router.post(
  '/image',
  protectAdmin,
  uploadSingleImage,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided.',
        });
      }

      // Upload buffer to Cloudinary
      const result = await uploadImageStream(req.file.buffer, 'mamta-hospital/doctors');

      return res.status(200).json({
        success: true,
        url: result.url,
        publicId: result.publicId,
      });
    } catch (error) {
      console.error('Cloudinary upload error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Image upload failed. Please try again.',
      });
    }
  }
);

export default router;
