import { v2 as cloudinary } from 'cloudinary';

/**
 * Ensure Cloudinary is configured before each use.
 * Deferred so that dotenv has loaded env vars by the time this runs.
 */
const ensureConfigured = () => {
  if (!cloudinary.config().cloud_name) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
};

/**
 * Upload an image buffer to Cloudinary using upload_stream.
 * Returns { url, publicId } on success.
 * @param {Buffer} fileBuffer - The image file buffer
 * @param {string} folder - The Cloudinary folder path
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadImageStream = (fileBuffer, folder = 'mamta-hospital/doctors') => {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Delete a Cloudinary asset by its public_id.
 * Resolves silently even on failure so callers can handle errors without breaking flows.
 * @param {string} publicId - The Cloudinary public_id to delete
 * @returns {Promise<object|null>}
 */
export const deleteImage = async (publicId) => {
  try {
    if (!publicId) return null;
    ensureConfigured();
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error(`Cloudinary delete failed for publicId "${publicId}":`, error.message);
    return null;
  }
};

export default cloudinary;
