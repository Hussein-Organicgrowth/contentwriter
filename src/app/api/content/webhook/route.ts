import { NextResponse } from "next/server";

export async function POST(req: Request) {
	try {
		const { webhookUrl, content } = await req.json();

		if (!webhookUrl) {
			return NextResponse.json(
				{ error: "Webhook URL is required" },
				{ status: 400 }
			);
		}

		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(content),
		});

		if (!response.ok) {
			throw new Error(`Webhook request failed with status ${response.status}`);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Webhook error:", error);
		return NextResponse.json(
			{ error: "Failed to send content to webhook" },
			{ status: 500 }
		);
	}
}
