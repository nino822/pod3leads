import { google } from "googleapis";
import { Session } from "next-auth";

export async function fetchSheetWithOAuth(
  session: Session | null,
  range: string
) {
  if (!session?.accessToken) {
    throw new Error("No access token available");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });

  const sheets = google.sheets({
    version: "v4",
    auth: oauth2Client,
  });

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range,
    });

    return res.data.values || [];
  } catch (error) {
    console.error("Error fetching sheet:", error);
    throw error;
  }
}

// Fallback to service account if API key is configured (for server-side only)
export async function fetchSheetWithServiceAccount(range: string) {
  if (
    !process.env.GOOGLE_CLIENT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY
  ) {
    throw new Error(
      "Service account credentials not configured. Use OAuth2 instead."
    );
  }

  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  );

  const sheets = google.sheets({ version: "v4", auth });

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range,
    });

    return res.data.values || [];
  } catch (error) {
    console.error("Error fetching sheet:", error);
    throw error;
  }
}
