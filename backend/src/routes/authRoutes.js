import express from 'express';
import { loginAdmin, getAdminProfile } from '../controllers/authController.js';
import { googleAuthRedirect, googleAuthCallback } from '../controllers/googleOAuthController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Admin Authentication ─────────────────────────────────────────────────────
router.post('/login', loginAdmin);
router.get('/me', protectAdmin, getAdminProfile);

// ── Google OAuth 2.0 Flow ────────────────────────────────────────────────────
// Step 1: Redirect browser to Google consent page
router.get('/google', googleAuthRedirect);

// Step 2: Google redirects here after user grants consent
// The refresh_token is logged SERVER-SIDE ONLY — never returned to browser
router.get('/google/callback', googleAuthCallback);

export default router;
