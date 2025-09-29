import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import {
  Website,
  PlatformConfig,
  DescriptionPlacementConfig,
} from "@/models/Website";

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
  if (!placement || placement.mode !== "metafield") {
    return { mode: "body_html" };
  }

  const namespace = (placement.metafieldNamespace || "").trim();
  const key = (placement.metafieldKey || "").trim();
  const type: DescriptionPlacementConfig["metafieldType"] =
    placement.metafieldType === "single_line_text_field"
      ? "single_line_text_field"
      : "multi_line_text_field";

  if (!namespace || !key) {
    return { mode: "body_html" };
  }

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

function prepareDescriptionForPlacement(
  description: string,
  placement: DescriptionPlacementConfig
): string {
  if (placement.mode === "metafield") {
    if (placement.metafieldType === "single_line_text_field") {
      return htmlToSingleLine(description);
    }
  }

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

    if (!company || !productId || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get the website document to access Shopify credentials
    const website = await Website.findOne({ name: company });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    const shopifyIntegration = website.platformIntegrations.find(
      (p: PlatformConfig) => p.platform === "shopify" && p.enabled
    );

    if (!shopifyIntegration) {
      return NextResponse.json(
        { error: "Shopify integration not found or disabled" },
        { status: 404 }
      );
    }

    const { storeName, accessToken } = shopifyIntegration.credentials;

    // Ensure storeName is properly formatted
    const formattedStoreName = storeName.includes(".myshopify.com")
      ? storeName
      : `${storeName}.myshopify.com`;

    // Extract numeric ID from Global ID
    const numericId = extractNumericId(String(productId));
    const productGid = buildProductGid(numericId);

    const descriptionPlacement = normalizeDescriptionPlacement(
      shopifyIntegration.settings?.descriptionPlacement
    );
    const syncSeoFields =
      shopifyIntegration.settings?.syncSeoFields !== undefined
        ? shopifyIntegration.settings.syncSeoFields
        : true;

    const input: Record<string, unknown> = {
      id: productGid,
    };

    if (descriptionPlacement.mode === "body_html") {
      input.bodyHtml = description;
    } else {
      const metafieldValue = prepareDescriptionForPlacement(
        description,
        descriptionPlacement
      );

      input.metafields = [
        {
          namespace: descriptionPlacement.metafieldNamespace,
          key: descriptionPlacement.metafieldKey,
          type: descriptionPlacement.metafieldType,
          value: metafieldValue,
        },
      ];

      if (summaryHtml) {
        input.bodyHtml = truncateHtml(summaryHtml, 1000);
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
    }

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
            bodyHtml
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

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      throw new Error(
        `Shopify GraphQL error: status ${graphResponse.status} - ${errorText}`
      );
    }

    const graphJson = await graphResponse.json();
    const userErrors = graphJson?.data?.productUpdate?.userErrors || [];

    if (Array.isArray(userErrors) && userErrors.length > 0) {
      const messages = userErrors
        .map((err: { message?: string }) => err.message)
        .filter(Boolean)
        .join(", ");
      throw new Error(
        messages || "Shopify returned errors while updating the product"
      );
    }

    const updatedProduct = graphJson?.data?.productUpdate?.product;

    return NextResponse.json({
      success: true,
      product: {
        id: updatedProduct?.id ?? productId,
        title: updatedProduct?.title ?? "",
        body_html:
          descriptionPlacement.mode === "metafield"
            ? updatedProduct?.bodyHtml ?? ""
            : updatedProduct?.bodyHtml ?? description,
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
