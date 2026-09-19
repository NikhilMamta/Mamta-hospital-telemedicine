import { createOAuth2Client, GOOGLE_CALENDAR_SCOPES } from '../config/google.js';

/**
 * @desc    Redirects the browser to Google's OAuth2 consent page.
 *          This initiates the flow to obtain a refresh token for Google Calendar access.
 * @route   GET /api/auth/google
 * @access  Public (should be accessed only by hospital admin once to obtain refresh token)
 */
export const googleAuthRedirect = (req, res) => {
  try {
    const oauth2Client = createOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',   // Required to receive a refresh_token
      prompt: 'consent',        // Force consent screen every time so refresh_token is always returned
      scope: GOOGLE_CALENDAR_SCOPES,
    });

    console.log('[GOOGLE OAUTH] Redirecting to Google authorization URL...');
    return res.redirect(authUrl);
  } catch (error) {
    console.error('[GOOGLE OAUTH] Failed to generate auth URL:', error.message);
    return res.status(500).send(`
      <html><body style="font-family:sans-serif;padding:40px;">
        <h2 style="color:#c53030;">Google OAuth Configuration Error</h2>
        <p>${error.message}</p>
        <p>Please ensure <strong>GOOGLE_CLIENT_ID</strong>, <strong>GOOGLE_CLIENT_SECRET</strong>, 
        and <strong>GOOGLE_REDIRECT_URI</strong> are set in environment variables.</p>
      </body></html>
    `);
  }
};

/**
 * @desc    Handles the OAuth2 callback from Google.
 *          Exchanges the authorization code for tokens and logs the refresh token SERVER-SIDE ONLY.
 *          The refresh token is NEVER sent to the browser.
 * @route   GET /api/auth/google/callback
 * @access  Public (Google redirects here after user grants consent)
 */
export const googleAuthCallback = async (req, res) => {
  const { code, error: oauthError } = req.query;

  // Handle OAuth errors (e.g. user denied access)
  if (oauthError) {
    console.error(`[GOOGLE OAUTH] OAuth error from Google: ${oauthError}`);
    return res.status(400).send(`
      <html><body style="font-family:sans-serif;padding:40px;">
        <h2 style="color:#c53030;">Google Authorization Failed</h2>
        <p>Google returned an error: <strong>${oauthError}</strong></p>
        <p>Please try again by visiting <code>/api/auth/google</code></p>
      </body></html>
    `);
  }

  // Validate that code is present
  if (!code) {
    console.error('[GOOGLE OAUTH] Callback received without authorization code.');
    return res.status(400).send(`
      <html><body style="font-family:sans-serif;padding:40px;">
        <h2 style="color:#c53030;">Missing Authorization Code</h2>
        <p>No authorization code was received from Google. Please restart the OAuth flow.</p>
        <p>Visit: <a href="/api/auth/google">/api/auth/google</a></p>
      </body></html>
    `);
  }

  try {
    const oauth2Client = createOAuth2Client();

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    const { refresh_token, access_token, expiry_date } = tokens;

    // ─────────────────────────────────────────────────────────────────────────
    // SECURITY: Log the refresh token to SERVER logs ONLY.
    // It is NEVER returned in the HTTP response or exposed to the browser.
    // ─────────────────────────────────────────────────────────────────────────
    if (refresh_token) {
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║         GOOGLE OAUTH — REFRESH TOKEN OBTAINED                ║');
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log(`║  GOOGLE_REFRESH_TOKEN=${refresh_token}`);
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log('║  ACTION REQUIRED:                                            ║');
      console.log('║  1. Copy the GOOGLE_REFRESH_TOKEN value above.               ║');
      console.log('║  2. Add it to your Render environment variables.             ║');
      console.log('║  3. Redeploy the backend.                                    ║');
      console.log('║  This token is printed once. Do NOT share or commit it.      ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('');
    } else {
      // refresh_token is only returned on first authorization or when prompt:consent is used.
      // If it's missing, the token may have been issued before (re-authorization without revoke).
      console.warn('[GOOGLE OAUTH] No refresh_token in response. If you already authorized this app, ' +
        'revoke access at https://myaccount.google.com/permissions and try again.');
    }

    if (access_token) {
      const expiryStr = expiry_date ? new Date(expiry_date).toISOString() : 'unknown';
      console.log(`[GOOGLE OAUTH] Access token received. Expires: ${expiryStr}`);
    }

    // Return a safe success page — NO tokens sent to browser
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Google Calendar Connected – Mamta Hospital</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: #f0fdf4;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
          }
          .card {
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
            padding: 48px 40px;
            max-width: 520px;
            width: 100%;
            text-align: center;
          }
          .icon { font-size: 56px; margin-bottom: 20px; }
          h1 { color: #166534; font-size: 22px; margin-bottom: 12px; }
          p { color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 12px; }
          .steps {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px 24px;
            text-align: left;
            margin: 20px 0;
          }
          .steps ol { padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8; }
          .note {
            background: #fefce8;
            border: 1px solid #fde68a;
            border-radius: 6px;
            padding: 12px 16px;
            font-size: 13px;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h1>Google Calendar Connected Successfully</h1>
          <p>Mamta Superspeciality Hospital has been granted access to Google Calendar.</p>
          <div class="steps">
            <strong>Next Steps:</strong>
            <ol>
              <li>Check your server logs for the <code>GOOGLE_REFRESH_TOKEN</code>.</li>
              <li>Copy the refresh token value.</li>
              <li>Add it to Render → Environment → <code>GOOGLE_REFRESH_TOKEN</code>.</li>
              <li>Redeploy the backend service on Render.</li>
            </ol>
          </div>
          <div class="note">
            🔒 The refresh token was printed to server logs only and was <strong>not</strong> sent to this browser for security.
          </div>
          <p style="margin-top:20px;">You can safely close this window.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('[GOOGLE OAUTH] Token exchange failed:', error.message);

    // Determine a safe user-facing message (do NOT expose internal details)
    const isInvalidGrant = error.message?.includes('invalid_grant') || error.message?.includes('Invalid grant');
    const userMessage = isInvalidGrant
      ? 'The authorization code has expired or was already used. Please restart the OAuth flow.'
      : 'An error occurred while connecting to Google Calendar. Check server logs for details.';

    return res.status(500).send(`
      <html><body style="font-family:sans-serif;padding:40px;max-width:540px;margin:auto;">
        <h2 style="color:#c53030;">Google OAuth Token Exchange Failed</h2>
        <p style="color:#374151;">${userMessage}</p>
        <p style="color:#6b7280;">Try again: <a href="/api/auth/google">/api/auth/google</a></p>
      </body></html>
    `);
  }
};
