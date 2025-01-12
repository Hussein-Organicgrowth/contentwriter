import { NextResponse } from "next/server";
import { Website } from "@/models/Website";
import connectToDatabase from "@/lib/mongodb";

interface WordPressCredentials {
	apiUrl: string;
	apiKey: string;
	username?: string;
}

async function testWordPressConnection(credentials: WordPressCredentials) {
	const { apiUrl, apiKey, username = "admin" } = credentials;
	const baseUrl = apiUrl.replace(/\/$/, "");

	try {
		// Clean up the API URL
		const apiEndpoint = `${baseUrl}/wp-json/wp/v2`;
		console.log("Testing connection to:", apiEndpoint);

		// Create proper authentication header
		const authString = Buffer.from(
			`${username}:${apiKey.replace(/\s+/g, "")}`
		).toString("base64");
		console.log(
			"Using auth string:",
			`${username}:${apiKey.replace(/\s+/g, "")}`
		);

		const response = await fetch(`${apiEndpoint}/users/me`, {
			headers: {
				Authorization: `Basic ${authString}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			const errorData = await response.text();
			console.error("WordPress API error:", {
				status: response.status,
				statusText: response.statusText,
				error: errorData,
			});
			throw new Error(`Failed to connect to WordPress: ${response.statusText}`);
		}

		const data = await response.json();
		return {
			success: true,
			data,
			message: "Successfully connected to WordPress",
		};
	} catch (error) {
		console.error("WordPress connection error:", error);
		throw error;
	}
}

export async function POST(req: Request) {
	try {
		await connectToDatabase();
		const body = await req.json();
		const { websiteName, credentials } = body;

		const website = await Website.findOne({ name: websiteName });
		if (!website) {
			return NextResponse.json({ error: "Website not found" }, { status: 404 });
		}

		try {
			const result = await testWordPressConnection(credentials);
			return NextResponse.json(result);
		} catch (error) {
			console.error("Connection test details:", error);
			return NextResponse.json(
				{
					error: "Connection test failed",
					details: error instanceof Error ? error.message : "Unknown error",
				},
				{ status: 400 }
			);
		}
	} catch (error) {
		console.error("WordPress API error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
