import { google } from "googleapis";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out;
}

function parseCsv(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map(parseCsvLine);
}

function getSheetNameFromRange(range: string): string {
  const bang = range.indexOf("!");
  if (bang === -1) {
    return range;
  }
  return range.slice(0, bang).trim();
}

export async function fetchSheetPublic(range: string) {
  if (!process.env.GOOGLE_SHEET_ID) {
    throw new Error("GOOGLE_SHEET_ID is missing");
  }

  const sheetName = getSheetNameFromRange(range);
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const url =
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Public sheet fetch failed (${res.status}) for tab: ${sheetName}`);
  }

  const csv = await res.text();
  const rows = parseCsv(csv);

  if (!rows.length) {
    throw new Error(`Public sheet returned empty data for tab: ${sheetName}`);
  }

  return rows;
}

// Fallback to service account if API key is configured (for server-side only)
export async function fetchSheetWithServiceAccount(range: string) {
  if (!process.env.GOOGLE_SHEET_ID) {
    throw new Error("GOOGLE_SHEET_ID is missing");
  }

  if (!process.env.GOOGLE_CLIENT_EMAIL) {
    throw new Error("GOOGLE_CLIENT_EMAIL is missing");
  }

  if (!process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error("GOOGLE_PRIVATE_KEY is missing");
  }

  if (process.env.GOOGLE_CLIENT_EMAIL.includes("your-service-account")) {
    throw new Error("GOOGLE_CLIENT_EMAIL is still using placeholder value");
  }

  if (process.env.GOOGLE_PRIVATE_KEY.includes("-----BEGIN PRIVATE KEY-----\\n...")) {
    throw new Error("GOOGLE_PRIVATE_KEY is still using placeholder value");
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
