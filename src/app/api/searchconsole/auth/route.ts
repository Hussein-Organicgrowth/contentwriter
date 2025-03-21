import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/searchconsole/callback`
);

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scopes = ["https://www.googleapis.com/auth/webmasters.readonly"];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state: userId, // Pass user ID in state for callback
  });

  return NextResponse.json({ authUrl });
}
