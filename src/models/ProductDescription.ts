import { model, models, Schema, Document } from "mongoose";

export interface IPendingProductDescription extends Document {
  websiteName: string;
  productId: string;
  oldDescription: string;
  newDescription: string;
  oldSeoTitle?: string;
  oldSeoDescription?: string;
  newSeoTitle?: string;
  newSeoDescription?: string;
  summaryHtml?: string;
  generatedAt: Date;
  isActive: boolean;
  version: number;
}

export interface IPublishedProductDescription extends Document {
  websiteName: string;
  productId: string;
  publishedAt: Date;
  isActive: boolean;
}

const pendingProductDescriptionSchema = new Schema<IPendingProductDescription>(
  {
    websiteName: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    oldDescription: { type: String, default: "" },
    newDescription: { type: String, required: true },
    oldSeoTitle: { type: String, default: "" },
    oldSeoDescription: { type: String, default: "" },
    newSeoTitle: { type: String, default: "" },
    newSeoDescription: { type: String, default: "" },
    summaryHtml: { type: String, default: "" },
    generatedAt: { type: Date, required: true, default: Date.now, index: true },
    isActive: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
pendingProductDescriptionSchema.index({ websiteName: 1, productId: 1 });
pendingProductDescriptionSchema.index({ websiteName: 1, isActive: 1 });
pendingProductDescriptionSchema.index({ generatedAt: -1 });

const publishedProductDescriptionSchema =
  new Schema<IPublishedProductDescription>(
    {
      websiteName: { type: String, required: true, index: true },
      productId: { type: String, required: true, index: true },
      publishedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
      },
      isActive: { type: Boolean, default: true },
    },
    {
      timestamps: true,
    }
  );

// Compound indexes for efficient queries
publishedProductDescriptionSchema.index(
  { websiteName: 1, productId: 1 },
  { unique: true }
);
publishedProductDescriptionSchema.index({ publishedAt: -1 });

export const PendingProductDescription =
  models.PendingProductDescription ||
  model<IPendingProductDescription>(
    "PendingProductDescription",
    pendingProductDescriptionSchema
  );

export const PublishedProductDescription =
  models.PublishedProductDescription ||
  model<IPublishedProductDescription>(
    "PublishedProductDescription",
    publishedProductDescriptionSchema
  );
