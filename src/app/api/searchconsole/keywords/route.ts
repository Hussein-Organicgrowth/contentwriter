import { NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { Website } from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const property = searchParams.get("property");

  if (!property) {
    return NextResponse.json(
      { error: "Property is required" },
      { status: 400 }
    );
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
      return NextResponse.json({ keywords: [] });
    }

    // Use the first website's Search Console credentials
    const website = websites[0];
    const searchConsoleIntegration = website.platformIntegrations.find(
      (integration: any) => integration.platform === "searchconsole"
    );

    if (!searchConsoleIntegration?.credentials.accessToken) {
      return NextResponse.json({ keywords: [] });
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

    // Get search analytics data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await searchConsole.searchanalytics.query({
      auth: oauth2Client,
      siteUrl: property,
      requestBody: {
        startDate: thirtyDaysAgo.toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        dimensions: ["query", "page"],
        type: "web",
        rowLimit: 1000,
      },
    });

    const keywords =
      data.rows?.map((row) => ({
        keyword: row.keys?.[0],
        url: row.keys?.[1],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })) || [];

    // Filter and sort keywords:
    // 1. Only include keywords with position <= 7
    // 2. Sort by position (lower is better)
    // 3. For same position, sort by impressions (higher is better)
    const sortedKeywords = keywords
      .filter((keyword) => keyword.position && keyword.position >= 7)
      .sort((a, b) => {
        if (a.position === b.position) {
          return (b.impressions ?? 0) - (a.impressions ?? 0);
        }
        return (a.position ?? 0) - (b.position ?? 0);
      })
      .slice(0, 40); // Get top 20 opportunities

    // Update the website's Search Console settings with the latest keywords
    if (searchConsoleIntegration.settings) {
      searchConsoleIntegration.settings.searchConsole = {
        lastSync: new Date().toISOString(),
        keywordOpportunities: sortedKeywords,
      };
      await website.save();
    }

    return NextResponse.json({ keywords: sortedKeywords });
  } catch (error) {
    console.error("Error fetching Search Console keywords:", error);
    return NextResponse.json(
      { error: "Failed to fetch keywords" },
      { status: 500 }
    );
  }
}
