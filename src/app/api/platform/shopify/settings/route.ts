import { NextResponse } from "next/server";
import {
  Website,
  PlatformConfig,
  DescriptionPlacementConfig,
} from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";

const DEFAULT_PLACEMENT: DescriptionPlacementConfig = { mode: "body_html" };

function sanitizeDescriptionPlacement(
  input: unknown
): DescriptionPlacementConfig {
  if (!input || typeof input !== "object") {
    return DEFAULT_PLACEMENT;
  }

  const candidate = input as Partial<DescriptionPlacementConfig>;

  if (candidate.mode === "metafield") {
    const namespace =
      typeof candidate.metafieldNamespace === "string"
        ? candidate.metafieldNamespace.trim()
        : "";
    const key =
      typeof candidate.metafieldKey === "string"
        ? candidate.metafieldKey.trim()
        : "";
    const type: DescriptionPlacementConfig["metafieldType"] =
      candidate.metafieldType === "single_line_text_field"
        ? "single_line_text_field"
        : candidate.metafieldType === "rich_text_editor"
        ? "rich_text_editor"
        : "multi_line_text_field";

    if (namespace && key) {
      return {
        mode: "metafield",
        metafieldNamespace: namespace,
        metafieldKey: key,
        metafieldType: type,
      };
    }
  }

  return DEFAULT_PLACEMENT;
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const company = url.searchParams.get("company");

    if (!company) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    const website = await Website.findOne({ name: company });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    const shopifyIntegration = website.platformIntegrations?.find(
      (p: PlatformConfig) => p.platform === "shopify"
    );

    if (!shopifyIntegration) {
      return NextResponse.json(
        { error: "Shopify integration not found" },
        { status: 404 }
      );
    }

    const rawPlacement = shopifyIntegration.settings?.descriptionPlacement;
    const sanitizedPlacement = sanitizeDescriptionPlacement(rawPlacement);

    console.log("[DEBUG] GET settings - Raw from DB:", rawPlacement);
    console.log(
      "[DEBUG] GET settings - After sanitization:",
      sanitizedPlacement
    );

    const settings = {
      ...shopifyIntegration,
      credentials: {
        storeName: shopifyIntegration.credentials?.storeName || "",
        accessToken: shopifyIntegration.credentials?.accessToken
          ? "••••••••"
          : "",
      },
      settings: {
        ...shopifyIntegration.settings,
        descriptionPlacement: sanitizedPlacement,
        syncSeoFields: shopifyIntegration.settings?.syncSeoFields ?? false,
      },
    };

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Error fetching Shopify settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const {
      credentials,
      enabled,
      company: websiteName,
      keepExistingToken,
      descriptionPlacement,
      syncSeoFields,
    } = await req.json();

    const sanitizedPlacement =
      sanitizeDescriptionPlacement(descriptionPlacement);
    const sanitizedSyncSeo =
      typeof syncSeoFields === "boolean" ? syncSeoFields : false;

    console.log("[DEBUG] Received request body:", {
      credentials,
      enabled,
      websiteName,
      keepExistingToken,
      rawDescriptionPlacement: descriptionPlacement,
      sanitizedDescriptionPlacement: sanitizedPlacement,
      syncSeoFields: sanitizedSyncSeo,
    });

    if (!websiteName) {
      return NextResponse.json(
        { error: "Website name is required" },
        { status: 400 }
      );
    }

    const website = await Website.findOne({ name: websiteName });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    // Update or add Shopify integration settings
    const platformIntegrations = website.platformIntegrations || [];
    const shopifyIndex = platformIntegrations.findIndex(
      (p: PlatformConfig) => p.platform === "shopify"
    );

    // If we need to keep the existing token and there's an existing integration
    let existingAccessToken = "";
    if (keepExistingToken && shopifyIndex >= 0) {
      existingAccessToken =
        platformIntegrations[shopifyIndex]?.credentials?.accessToken || "";
    }

    if (shopifyIndex >= 0) {
      const updateFields: Record<string, unknown> = {
        "platformIntegrations.$.platform": "shopify",
        "platformIntegrations.$.enabled": Boolean(enabled),
        "platformIntegrations.$.credentials.storeName":
          credentials.storeName || "",
        "platformIntegrations.$.settings.descriptionPlacement":
          sanitizedPlacement,
        "platformIntegrations.$.settings.syncSeoFields": sanitizedSyncSeo,
      };

      if (credentials.accessToken || !keepExistingToken) {
        updateFields["platformIntegrations.$.credentials.accessToken"] =
          credentials.accessToken || "";
      } else if (keepExistingToken) {
        // If keeping existing token, use the one we retrieved
        updateFields["platformIntegrations.$.credentials.accessToken"] =
          existingAccessToken;
      }

      // Log if we're disabling the integration
      if (enabled === false) {
        console.log("Disabling Shopify integration for website:", websiteName);
      }

      const result = await Website.findOneAndUpdate(
        {
          name: websiteName,
          "platformIntegrations.platform": "shopify",
        },
        {
          $set: updateFields,
        },
        { new: true }
      );
      if (!result) {
        throw new Error("Failed to update Shopify integration");
      }
    } else {
      const newIntegration = {
        platform: "shopify",
        enabled: Boolean(enabled),
        credentials: {
          storeName: credentials.storeName || "",
          accessToken: credentials.accessToken || "",
        },
        settings: {
          autoPublish: false,
          defaultStatus: "draft",
          descriptionPlacement: sanitizedPlacement,
          syncSeoFields: sanitizedSyncSeo,
        },
      };

      const result = await Website.findOneAndUpdate(
        { name: websiteName },
        {
          $push: { platformIntegrations: newIntegration },
        },
        { new: true }
      );
      if (!result) {
        throw new Error("Failed to add Shopify integration");
      }
    }

    // Fetch the updated document
    const updatedWebsite = await Website.findOne({ name: websiteName });
    if (!updatedWebsite) {
      throw new Error("Failed to fetch updated website");
    }

    const savedIntegration = updatedWebsite.platformIntegrations.find(
      (p: PlatformConfig) => p.platform === "shopify"
    );

    // Add detailed logging
    console.log(
      "Complete updated website:",
      JSON.stringify(updatedWebsite, null, 2)
    );
    console.log(
      "Saved integration:",
      JSON.stringify(savedIntegration, null, 2)
    );
    console.log("Saved credentials:", savedIntegration?.credentials);

    return NextResponse.json({
      success: true,
      savedSettings: savedIntegration,
    });
  } catch (error) {
    console.error("Shopify settings API error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
