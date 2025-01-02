import mongoose, { Schema, model, models } from "mongoose";

export interface IContent {
	title: string;
	html: string;
}

export interface IWebsite {
	_id?: string;
	content: IContent[];
	toneofvoice: string;
	description: string;
	name: string;
	website: string;
	summary: string;
	userId: string;
}

const contentSchema = new Schema<IContent>({
	title: { type: String, required: true },
	html: { type: String, required: true },
});

const websiteSchema = new Schema<IWebsite>(
	{
		content: { type: [contentSchema], default: [] },
		toneofvoice: { type: String, default: "" },
		description: { type: String, default: "" },
		name: { type: String, required: true },
		website: { type: String, required: true },
		summary: { type: String, required: true },
		userId: { type: String, required: true },
	},
	{
		timestamps: true,
	}
);

export const Website =
	models.Website || model<IWebsite>("Website", websiteSchema);
