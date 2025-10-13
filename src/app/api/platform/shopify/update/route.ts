import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import {
  Website,
  PlatformConfig,
  DescriptionPlacementConfig,
} from "@/models/Website";

// In-memory cache for website credentials
interface CachedWebsite {
  website: {
    platformIntegrations: PlatformConfig[];
    [key: string]: unknown;
  };
  timestamp: number;
}

const credentialsCache = new Map<string, CachedWebsite>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedWebsite(company: string) {
  const cached = credentialsCache.get(company);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Cache] Hit for company: ${company}`);
    return cached.website;
  }
  console.log(`[Cache] Miss for company: ${company}`);
  return null;
}

function setCachedWebsite(company: string, website: CachedWebsite["website"]) {
  credentialsCache.set(company, {
    website,
    timestamp: Date.now(),
  });
  console.log(`[Cache] Stored credentials for company: ${company}`);
}

// Helper function to extract numeric ID from Shopify Global ID
function extractNumericId(gid: string): string {
  const match = gid.match(/\/(\d+)$/);
  if (!match) {
    throw new Error("Invalid Shopify Global ID format");
  }
  return match[1];
}

interface UpdatePayload {
  productId: string;
  description: string;
  company: string;
  seoTitle?: string;
  seoDescription?: string;
  summaryHtml?: string;
}

function buildProductGid(numericId: string) {
  return `gid://shopify/Product/${numericId}`;
}

function normalizeDescriptionPlacement(
  placement?: DescriptionPlacementConfig | null
): DescriptionPlacementConfig {
  console.log(
    "[DEBUG] normalizeDescriptionPlacement input:",
    JSON.stringify(placement, null, 2)
  );

  if (!placement || placement.mode !== "metafield") {
    console.log(
      "[DEBUG] Using body_html mode (no metafield placement specified)"
    );
    return { mode: "body_html" };
  }

  const namespace = (placement.metafieldNamespace || "").trim();
  const key = (placement.metafieldKey || "").trim();
  const type: DescriptionPlacementConfig["metafieldType"] =
    placement.metafieldType === "single_line_text_field"
      ? "single_line_text_field"
      : placement.metafieldType === "rich_text_editor"
      ? "rich_text_editor"
      : "multi_line_text_field";

  if (!namespace || !key) {
    console.log("[DEBUG] Missing namespace or key, falling back to body_html");
    return { mode: "body_html" };
  }

  console.log("[DEBUG] Using metafield mode:", { namespace, key, type });
  return {
    mode: "metafield",
    metafieldNamespace: namespace,
    metafieldKey: key,
    metafieldType: type,
  };
}

function htmlToSingleLine(html: string): string {
  return html
    .replace(/\r?\n|\r|\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateHtml(html: string, maxLength = 1000): string {
  if (html.length <= maxLength) return html;
  return `${html.slice(0, maxLength - 3)}...`;
}

function mapMetafieldTypeToShopify(type: string | undefined): string {
  // Map our internal type names to Shopify's GraphQL API type names
  if (type === "rich_text_editor") {
    return "rich_text_field";
  }
  return type || "multi_line_text_field";
}

interface RichTextNode {
  type: string;
  value?: string;
  bold?: boolean;
  level?: number;
  listType?: string;
  children?: RichTextNode[];
}

function convertHtmlToShopifyRichText(html: string): string {
  // Parse HTML and convert to Shopify's rich text JSON format maintaining order
  const children: RichTextNode[] = [];

  // Match all block-level elements in order
  const blockRegex = /<(h[1-3]|p|ul)>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const content = match[2];

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      // Heading
      const level = parseInt(tag.charAt(1));
      children.push({
        type: "heading",
        level: level,
        children: [
          { type: "text", value: content.replace(/<[^>]*>/g, "").trim() },
        ],
      });
    } else if (tag === "p") {
      // Paragraph with potential nested strong tags
      const paragraphChildren: RichTextNode[] = [];
      const strongRegex = /<strong>(.*?)<\/strong>/gi;
      let lastIndex = 0;
      let strongMatch;

      while ((strongMatch = strongRegex.exec(content)) !== null) {
        if (strongMatch.index > lastIndex) {
          const beforeText = content
            .slice(lastIndex, strongMatch.index)
            .replace(/<[^>]*>/g, "");
          if (beforeText) {
            paragraphChildren.push({ type: "text", value: beforeText });
          }
        }
        paragraphChildren.push({
          type: "text",
          value: strongMatch[1].replace(/<[^>]*>/g, ""),
          bold: true,
        });
        lastIndex = strongRegex.lastIndex;
      }

      if (lastIndex < content.length) {
        const afterText = content.slice(lastIndex).replace(/<[^>]*>/g, "");
        if (afterText) {
          paragraphChildren.push({ type: "text", value: afterText });
        }
      }

      // Trim only the first and last text nodes
      if (paragraphChildren.length > 0) {
        const firstChild = paragraphChildren[0];
        if (firstChild.value) {
          firstChild.value = firstChild.value.trimStart();
        }
        const lastChild = paragraphChildren[paragraphChildren.length - 1];
        if (lastChild.value) {
          lastChild.value = lastChild.value.trimEnd();
        }
      }

      if (paragraphChildren.length === 0) {
        const textContent = content.replace(/<[^>]*>/g, "").trim();
        if (textContent) {
          paragraphChildren.push({ type: "text", value: textContent });
        }
      }

      if (paragraphChildren.length > 0) {
        children.push({
          type: "paragraph",
          children: paragraphChildren,
        });
      }
    } else if (tag === "ul") {
      // Unordered list
      const items = content.match(/<li>([\s\S]*?)<\/li>/gi) || [];
      const listChildren = items.map((item: string) => {
        const itemContent = item.replace(/<\/?li>/gi, "");
        const itemChildren: RichTextNode[] = [];

        // Handle strong tags within list items
        const strongRegex = /<strong>(.*?)<\/strong>/gi;
        let lastIndex = 0;
        let strongMatch;

        while ((strongMatch = strongRegex.exec(itemContent)) !== null) {
          if (strongMatch.index > lastIndex) {
            const beforeText = itemContent
              .slice(lastIndex, strongMatch.index)
              .replace(/<[^>]*>/g, "")
              .trim();
            if (beforeText) {
              itemChildren.push({ type: "text", value: beforeText });
            }
          }
          itemChildren.push({
            type: "text",
            value: strongMatch[1].replace(/<[^>]*>/g, "").trim(),
            bold: true,
          });
          lastIndex = strongRegex.lastIndex;
        }

        if (lastIndex < itemContent.length) {
          const afterText = itemContent
            .slice(lastIndex)
            .replace(/<[^>]*>/g, "")
            .trim();
          if (afterText) {
            itemChildren.push({ type: "text", value: afterText });
          }
        }

        if (itemChildren.length === 0) {
          itemChildren.push({
            type: "text",
            value: itemContent.replace(/<[^>]*>/g, "").trim(),
          });
        }

        return {
          type: "list-item",
          children: itemChildren,
        };
      });

      if (listChildren.length > 0) {
        children.push({
          type: "list",
          listType: "unordered",
          children: listChildren,
        });
      }
    }
  }

  return JSON.stringify({
    type: "root",
    children:
      children.length > 0
        ? children
        : [
            {
              type: "paragraph",
              children: [
                { type: "text", value: html.replace(/<[^>]*>/g, "").trim() },
              ],
            },
          ],
  });
}

function prepareDescriptionForPlacement(
  description: string,
  placement: DescriptionPlacementConfig
): string {
  if (placement.mode === "metafield") {
    if (placement.metafieldType === "single_line_text_field") {
      console.log("[DEBUG] Converting to single line text");
      return htmlToSingleLine(description);
    }

    if (placement.metafieldType === "rich_text_editor") {
      console.log("[DEBUG] Converting HTML to rich_text_field JSON format");
      console.log("[DEBUG] Original HTML length:", description.length);
      const richTextJson = convertHtmlToShopifyRichText(description);
      console.log("[DEBUG] Rich text JSON length:", richTextJson.length);
      console.log(
        "[DEBUG] Rich text JSON preview:",
        richTextJson.substring(0, 500)
      );
      return richTextJson;
    }
  }

  console.log("[DEBUG] Using description as-is");
  return description;
}

export async function POST(req: Request) {
  try {
    const {
      productId,
      description,
      company,
      seoTitle,
      seoDescription,
      summaryHtml,
    } = (await req.json()) as UpdatePayload;

    console.log("[DEBUG] Received update request:", {
      productId,
      company,
      descriptionLength: description?.length,
      hasSeoTitle: !!seoTitle,
      hasSeoDescription: !!seoDescription,
      hasSummaryHtml: !!summaryHtml,
    });

    if (!company || !productId || !description) {
      console.log("[DEBUG] Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Try to get website from cache first
    let website = getCachedWebsite(company);

    if (!website) {
      await connectToDatabase();
      console.log("[DEBUG] Connected to database");

      // Get the website document to access Shopify credentials
      website = await Website.findOne({ name: company });
      if (!website) {
        console.log("[DEBUG] Website not found:", company);
        return NextResponse.json(
          { error: "Website not found" },
          { status: 404 }
        );
      }

      // Cache the website for future requests
      setCachedWebsite(company, website);
    }

    console.log("[DEBUG] Found website:", company);

    const shopifyIntegration = website.platformIntegrations.find(
      (p: PlatformConfig) => p.platform === "shopify" && p.enabled
    );

    if (!shopifyIntegration) {
      console.log("[DEBUG] Shopify integration not found or disabled");
      return NextResponse.json(
        { error: "Shopify integration not found or disabled" },
        { status: 404 }
      );
    }

    console.log("[DEBUG] Found Shopify integration");

    const { storeName, accessToken } = shopifyIntegration.credentials;

    if (!storeName || !accessToken) {
      console.log("[DEBUG] Missing storeName or accessToken");
      return NextResponse.json(
        { error: "Shopify credentials are incomplete" },
        { status: 400 }
      );
    }

    // Ensure storeName is properly formatted
    const formattedStoreName = storeName.includes(".myshopify.com")
      ? storeName
      : `${storeName}.myshopify.com`;

    console.log("[DEBUG] Store name:", formattedStoreName);

    // Extract numeric ID from Global ID
    const numericId = extractNumericId(String(productId));
    const productGid = buildProductGid(numericId);

    console.log("[DEBUG] Product ID conversion:", {
      productId,
      numericId,
      productGid,
    });

    const descriptionPlacement = normalizeDescriptionPlacement(
      shopifyIntegration.settings?.descriptionPlacement
    );
    const syncSeoFields =
      shopifyIntegration.settings?.syncSeoFields !== undefined
        ? shopifyIntegration.settings.syncSeoFields
        : true;

    console.log("[DEBUG] Settings:", {
      descriptionPlacement,
      syncSeoFields,
    });

    const input: Record<string, unknown> = {
      id: productGid,
    };

    if (descriptionPlacement.mode === "body_html") {
      console.log("[DEBUG] Setting descriptionHtml directly");
      input.descriptionHtml = description;
    } else {
      console.log("[DEBUG] Preparing metafield value");
      const metafieldValue = prepareDescriptionForPlacement(
        description,
        descriptionPlacement
      );

      const shopifyMetafieldType = mapMetafieldTypeToShopify(
        descriptionPlacement.metafieldType
      );

      const metafieldConfig = {
        namespace: descriptionPlacement.metafieldNamespace,
        key: descriptionPlacement.metafieldKey,
        type: shopifyMetafieldType,
        value: metafieldValue,
      };

      input.metafields = [metafieldConfig];

      console.log("[DEBUG] Metafield configuration:", {
        ...metafieldConfig,
        originalType: descriptionPlacement.metafieldType,
        mappedType: shopifyMetafieldType,
      });

      if (summaryHtml) {
        console.log("[DEBUG] Setting truncated summaryHtml as descriptionHtml");
        input.descriptionHtml = truncateHtml(summaryHtml, 1000);
      }
    }

    const seoInput: Record<string, string> = {};
    if (syncSeoFields) {
      if (typeof seoTitle === "string" && seoTitle.trim().length > 0) {
        seoInput.title = seoTitle.trim();
      }
      if (
        typeof seoDescription === "string" &&
        seoDescription.trim().length > 0
      ) {
        seoInput.description = seoDescription.trim();
      }
    }
    if (Object.keys(seoInput).length > 0) {
      input.seo = seoInput;
      console.log("[DEBUG] SEO fields:", seoInput);
    }

    console.log("[DEBUG] Final input object:", JSON.stringify(input, null, 2));

    const selectionMetafield =
      descriptionPlacement.mode === "metafield"
        ? `
              metafield(namespace: "${descriptionPlacement.metafieldNamespace}", key: "${descriptionPlacement.metafieldKey}") {
                namespace
                key
                value
                type
              }
            `
        : "";

    const mutation = `
      mutation UpdateProduct($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            descriptionHtml
            seo {
              title
              description
            }
            ${selectionMetafield}
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    console.log("[DEBUG] Sending GraphQL mutation to Shopify...");

    const graphResponse = await fetch(
      `https://${formattedStoreName}/admin/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            input,
          },
        }),
      }
    );

    console.log("[DEBUG] Shopify response status:", graphResponse.status);

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error("[DEBUG] Shopify API error:", errorText);
      throw new Error(
        `Shopify GraphQL error: status ${graphResponse.status} - ${errorText}`
      );
    }

    const graphJson = await graphResponse.json();
    console.log(
      "[DEBUG] Shopify response:",
      JSON.stringify(graphJson, null, 2)
    );

    const userErrors = graphJson?.data?.productUpdate?.userErrors || [];

    if (Array.isArray(userErrors) && userErrors.length > 0) {
      console.error("[DEBUG] Shopify user errors:", userErrors);
      const messages = userErrors
        .map((err: { message?: string }) => err.message)
        .filter(Boolean)
        .join(", ");
      throw new Error(
        messages || "Shopify returned errors while updating the product"
      );
    }

    const updatedProduct = graphJson?.data?.productUpdate?.product;
    console.log("[DEBUG] Product updated successfully:", updatedProduct?.id);

    return NextResponse.json({
      success: true,
      product: {
        id: updatedProduct?.id ?? productId,
        title: updatedProduct?.title ?? "",
        body_html:
          descriptionPlacement.mode === "metafield"
            ? updatedProduct?.descriptionHtml ?? ""
            : updatedProduct?.descriptionHtml ?? description,
        seoTitle: updatedProduct?.seo?.title ?? seoTitle ?? "",
        seoDescription:
          updatedProduct?.seo?.description ?? seoDescription ?? "",
        metafield:
          descriptionPlacement.mode === "metafield"
            ? {
                namespace: descriptionPlacement.metafieldNamespace,
                key: descriptionPlacement.metafieldKey,
                value:
                  updatedProduct?.metafield?.value !== undefined
                    ? updatedProduct.metafield.value
                    : description,
                type:
                  updatedProduct?.metafield?.type ??
                  descriptionPlacement.metafieldType,
              }
            : undefined,
        descriptionSource: descriptionPlacement.mode,
      },
    });
  } catch (error: unknown) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
