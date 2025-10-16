import mongoose, { model, models } from "mongoose";

export type DescriptionPlacementMode = "body_html" | "metafield";

export type MetafieldTypeOption =
  | "single_line_text_field"
  | "multi_line_text_field"
  | "rich_text_editor";

export interface DescriptionPlacementConfig {
  mode: DescriptionPlacementMode;
  metafieldNamespace?: string;
  metafieldKey?: string;
  metafieldType?: MetafieldTypeOption;
}

export interface PlatformConfig {
  platform: "wordpress" | "shopify" | "searchconsole";
  enabled: boolean;
  credentials: {
    apiUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    storeName?: string;
    username?: string;
    refreshToken?: string;
    propertyUrl?: string;
  };
  settings: {
    autoPublish: boolean;
    defaultStatus: "draft" | "publish";
    categoryMapping?: Record<string, string>;
    tagMapping?: Record<string, string>;
    postType?: "post" | "page" | "custom";
    customPostType?: string;
    featuredImage?: {
      enabled: boolean;
      defaultImage?: string;
      useFirstImage: boolean;
    };
    author?: {
      useDefault: boolean;
      defaultAuthorId?: number;
    };
    customFields?: Array<{
      key: string;
      value: string | number | boolean;
      type: "text" | "number" | "boolean";
    }>;
    searchConsole?: {
      lastSync?: string;
      keywordOpportunities?: Array<{
        keyword: string;
        position: number;
        clicks: number;
        impressions: number;
        ctr: number;
        volume?: number;
      }>;
    };
    descriptionPlacement?: DescriptionPlacementConfig;
    syncSeoFields?: boolean;
  };
}

export interface IWebsite extends mongoose.Document {
  name: string;
  website: string;
  description: string;
  summary: string;
  toneofvoice: string;
  targetAudience: string;
  content: Array<{
    _id: string;
    title: string;
    html: string;
    date: string;
    status: "Published" | "Draft";
    contentType: string;
    mainKeyword: string;
    relatedKeywords: string[];
    folderId?: string | null;
    platformPublishStatus?: Record<
      string,
      {
        published: boolean;
        publishedUrl?: string;
        lastSynced?: string;
        error?: string;
      }
    >;
  }>;
  pendingProductDescriptions: Array<{
    productId: string;
    oldDescription: string;
    newDescription: string;
    generatedAt: string;
    oldSeoTitle?: string;
    oldSeoDescription?: string;
    newSeoTitle?: string;
    newSeoDescription?: string;
    summaryHtml?: string;
  }>;
  publishedProducts: Array<{
    productId: string;
    publishedAt: string;
  }>;
  pendingCollectionDescriptions: Array<{
    collectionId: string;
    oldDescription: string;
    newDescription: string;
    generatedAt: string;
  }>;
  folders: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
  userId: string;
  sharedUsers: string[];
  platformIntegrations: PlatformConfig[];
  sitemapUrls?: string[];
  businessAnalysis?: string;
  contentStructureAnalysis?: string;
  keyUrls?: string[];
  productDescriptionsMigrated?: boolean;
  productDescriptionsMigratedAt?: Date;
}

const websiteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  website: { type: String, required: true },
  description: { type: String, required: true },
  summary: { type: String, required: true },
  toneofvoice: { type: String, required: true },
  targetAudience: { type: String, required: true },
  content: [
    {
      _id: { type: String },
      title: String,
      html: String,
      date: String,
      status: String,
      contentType: String,
      mainKeyword: String,
      relatedKeywords: [String],
      folderId: { type: String, default: null },
      platformPublishStatus: {
        type: Map,
        of: {
          published: Boolean,
          publishedUrl: String,
          lastSynced: String,
          error: String,
        },
        default: {},
      },
    },
  ],
  pendingProductDescriptions: [
    {
      productId: { type: String, required: true },
      oldDescription: { type: String, default: "" },
      newDescription: { type: String, required: true },
      generatedAt: { type: String, required: true },
      oldSeoTitle: { type: String, default: "" },
      oldSeoDescription: { type: String, default: "" },
      newSeoTitle: { type: String, default: "" },
      newSeoDescription: { type: String, default: "" },
      summaryHtml: { type: String, default: "" },
    },
  ],
  publishedProducts: [
    {
      productId: { type: String, required: true },
      publishedAt: { type: String, required: true },
    },
  ],
  pendingCollectionDescriptions: [
    {
      collectionId: { type: String, required: true },
      oldDescription: { type: String, default: "" },
      newDescription: { type: String, required: true },
      generatedAt: { type: String, required: true },
    },
  ],
  folders: [
    {
      id: { type: String, required: true },
      name: { type: String, required: true },
      createdAt: { type: String, required: true },
    },
  ],
  userId: { type: String, required: true },
  sharedUsers: { type: [String], default: [] },
  platformIntegrations: [
    {
      _id: false,
      platform: {
        type: String,
        enum: ["wordpress", "shopify", "searchconsole"],
        required: true,
      },
      enabled: { type: Boolean, default: false },
      credentials: new mongoose.Schema(
        {
          apiUrl: { type: String, default: "" },
          apiKey: { type: String, default: "" },
          apiSecret: { type: String, default: "" },
          accessToken: { type: String, default: "" },
          storeName: { type: String, default: "" },
          username: { type: String, default: "" },
          refreshToken: { type: String, default: "" },
          propertyUrl: { type: String, default: "" },
        },
        { _id: false }
      ),
      settings: new mongoose.Schema(
        {
          autoPublish: { type: Boolean, default: false },
          defaultStatus: {
            type: String,
            enum: ["draft", "publish"],
            default: "draft",
          },
          categoryMapping: { type: Map, of: String },
          tagMapping: { type: Map, of: String },
          postType: {
            type: String,
            enum: ["post", "page", "custom"],
          },
          customPostType: String,
          featuredImage: {
            enabled: Boolean,
            defaultImage: String,
            useFirstImage: Boolean,
          },
          author: {
            useDefault: Boolean,
            defaultAuthorId: Number,
          },
          customFields: [
            {
              key: String,
              value: mongoose.Schema.Types.Mixed,
              type: {
                type: String,
                enum: ["text", "number", "boolean"],
              },
            },
          ],
          searchConsole: {
            lastSync: String,
            keywordOpportunities: [
              {
                keyword: String,
                position: Number,
                clicks: Number,
                impressions: Number,
                ctr: Number,
                volume: Number,
              },
            ],
          },
          descriptionPlacement: {
            mode: {
              type: String,
              enum: ["body_html", "metafield"],
              default: "body_html",
            },
            metafieldNamespace: { type: String, default: "" },
            metafieldKey: { type: String, default: "" },
            metafieldType: {
              type: String,
              enum: [
                "single_line_text_field",
                "multi_line_text_field",
                "rich_text_editor",
              ],
            },
          },
          syncSeoFields: { type: Boolean, default: false },
        },
        { _id: false }
      ),
    },
  ],
  sitemapUrls: { type: [String], default: [] },
  businessAnalysis: { type: String, default: "" },
  contentStructureAnalysis: { type: String, default: "" },
  keyUrls: { type: [String], default: [] },
  productDescriptionsMigrated: { type: Boolean, default: false },
  productDescriptionsMigratedAt: { type: Date },
});

websiteSchema.index(
  { name: 1, "content.status": 1 },
  { name: "website_content_status_by_name" }
);

export const Website =
  models.Website || model<IWebsite>("Website", websiteSchema);
