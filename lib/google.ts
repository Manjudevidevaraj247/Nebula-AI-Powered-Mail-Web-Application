import { google } from "googleapis";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (!clientId) {
  throw new Error("GOOGLE_CLIENT_ID is missing");
}

if (!clientSecret) {
  throw new Error("GOOGLE_CLIENT_SECRET is missing");
}

if (!redirectUri) {
  throw new Error("GOOGLE_REDIRECT_URI is missing");
}

export const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri
);