import { google } from 'googleapis';

/**
 * Creates and returns a configured Google OAuth2 client.
 * Reads credentials from environment variables only — never hardcoded.
 *
 * @returns {import('googleapis').Auth.OAuth2Client}
 */
export const createOAuth2Client = () => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri = (process.env.GOOGLE_REDIRECT_URI || '').trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Google OAuth credentials are missing. ' +
      'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in environment variables.'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

/**
 * Returns an authenticated Google Calendar v3 client using the saved refresh token.
 * Call this once per request — it handles token refresh automatically.
 *
 * @returns {import('googleapis').calendar_v3.Calendar}
 */
export const getGoogleCalendarClient = () => {
  const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || '').trim();

  if (!refreshToken) {
    throw new Error(
      'GOOGLE_REFRESH_TOKEN is not set. ' +
      'Complete the OAuth flow at /api/auth/google to obtain a refresh token, ' +
      'then add it to your environment variables.'
    );
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.calendar({ version: 'v3', auth: oauth2Client });
};

/** Google Calendar scopes required by this application */
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
];
