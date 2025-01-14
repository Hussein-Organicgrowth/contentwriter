import mongoose, { Schema, model, models } from "mongoose";

export interface PlatformConfig {
  platform: "wordpress" | "shopify";
  enabled: boolean;
  credentials: {
    apiUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    storeName?: string;
    username?: string;
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
      value: any;
      type: "text" | "number" | "boolean";
    }>;
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
  folders: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
  userId: string;
  sharedUsers: string[];
  platformIntegrations: PlatformConfig[];
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
      _id: { type: String, required: true },
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
        enum: ["wordpress", "shopify"],
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
        },
        { _id: false }
      ),
    },
  ],
});

export const Website =
  models.Website || model<IWebsite>("Website", websiteSchema);
