import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { Website } from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    // Get user's websites with Search Console integration
    const websites = await Website.find({
      userId: userId,
      "platformIntegrations.platform": "searchconsole",
      "platformIntegrations.enabled": true,
    });

    if (websites.length === 0) {
      return NextResponse.json({ properties: [] });
    }

    // Use the first website's Search Console credentials
    const website = websites[0];
    const searchConsoleIntegration = website.platformIntegrations.find(
      (integration: any) => integration.platform === "searchconsole"
    );

    if (!searchConsoleIntegration?.credentials.accessToken) {
      return NextResponse.json({ properties: [] });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/searchconsole/callback`
    );

    oauth2Client.setCredentials({
      access_token: searchConsoleIntegration.credentials.accessToken,
      refresh_token: searchConsoleIntegration.credentials.refreshToken,
    });

    const searchConsole = google.searchconsole("v1");
    const { data } = await searchConsole.sites.list({
      auth: oauth2Client,
    });

    const properties =
      data.siteEntry?.map((site) => ({
        siteUrl: site.siteUrl,
        permissionLevel: site.permissionLevel,
      })) || [];

    return NextResponse.json({ properties });
  } catch (error) {
    console.error("Error fetching Search Console properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}
