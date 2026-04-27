/**
 * Google OAuth configuration for Echo's Google Drive integration.
 *
 * SETUP REQUIRED:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a project (or select existing "Echo" project)
 * 3. Enable "Google Identity" API
 * 4. Go to Credentials → Create Credentials → OAuth client ID
 * 5. Application type: "Web application"
 * 6. Add http://localhost as authorized JavaScript origin
 * 7. Copy the Client ID and replace the placeholder below
 *
 * NOTE: This MUST be a "Web application" client ID, even for Android/iOS.
 * This is the same value used in capacitor.config.ts → plugins.GoogleSignIn.clientId
 */

export const GOOGLE_OAUTH = {
  /** Replace with your Google OAuth Web Client ID */
  WEB_CLIENT_ID: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',

  /** OAuth scopes needed for Google Drive integration */
  SCOPES: [
    'https://www.googleapis.com/auth/drive.file', // Create/modify files created by this app
  ],
};
