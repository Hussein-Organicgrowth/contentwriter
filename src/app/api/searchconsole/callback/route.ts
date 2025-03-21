import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Website } from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/searchconsole/callback`
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // Contains user ID
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/insight/findcontent?error=${error}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/insight/findcontent?error=missing_params`
    );
  }

  try {
    await connectToDatabase();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user's websites
    const websites = await Website.find({ userId: state });

    // Update each website with Search Console credentials
    for (const website of websites) {
      const existingIntegration = website.platformIntegrations.find(
        (integration) => integration.platform === "searchconsole"
      );

      if (existingIntegration) {
        existingIntegration.enabled = true;
        existingIntegration.credentials = {
          ...existingIntegration.credentials,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        };
      } else {
        website.platformIntegrations.push({
          platform: "searchconsole",
          enabled: true,
          credentials: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
          },
          settings: {
            autoPublish: false,
            defaultStatus: "draft",
          },
        });
      }
    }

    await Promise.all(websites.map((website) => website.save()));

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/insight/findcontent?success=true`
    );
  } catch (error) {
    console.error("Error in Search Console callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/insight/findcontent?error=auth_failed`
    );
  }
}
