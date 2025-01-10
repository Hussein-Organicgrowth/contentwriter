import mongoose, { Schema, model, models } from "mongoose";

export interface IWebsite extends mongoose.Document {
  name: string;
  toneofvoice: string;
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
  }>;
  folders: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
  userId: string;
  sharedUsers: string[];
}

const websiteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  toneofvoice: { type: String, required: true },
  content: [
    {
      _id: String,
      title: String,
      html: String,
      date: String,
      status: String,
      contentType: String,
      mainKeyword: String,
      relatedKeywords: [String],
      folderId: { type: String, default: null },
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
});

export const Website =
  models.Website || model<IWebsite>("Website", websiteSchema);
