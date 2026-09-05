import express from 'express';
import { calcomWebhookHandler } from '../controllers/calcomWebhookController.js';

const router = express.Router();

/**
 * Cal.com Webhook endpoint.
 * 
 * IMPORTANT: express.raw() is applied here so we get the raw Buffer body
 * needed for HMAC-SHA256 signature verification.
 * This route must be mounted in app.js BEFORE express.json() middleware.
 */
router.post(
  '/webhooks/calcom',
  express.raw({ type: 'application/json' }),
  calcomWebhookHandler
);

export default router;
