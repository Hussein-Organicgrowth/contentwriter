"use client";

import { useState, useEffect } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

export default function Settings() {
	const [webhookUrl, setWebhookUrl] = useState("");

	useEffect(() => {
		const savedWebhookUrl = localStorage.getItem("webhookUrl");
		if (savedWebhookUrl) setWebhookUrl(savedWebhookUrl);
	}, []);

	const saveWebhookSettings = () => {
		try {
			localStorage.setItem("webhookUrl", webhookUrl);
			toast.success("Webhook settings saved successfully");
		} catch (error) {
			toast.error("Failed to save webhook settings");
		}
	};

	return (
		<div className="container mx-auto p-6">
			<div className="flex flex-col space-y-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Settings</h1>
					<p className="text-muted-foreground">
						Configure your content publishing settings
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Webhook Settings</CardTitle>
						<CardDescription>
							Configure your webhook endpoint for content delivery
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="webhookUrl">Webhook URL</Label>
							<Input
								id="webhookUrl"
								placeholder="https://your-webhook-url.com"
								value={webhookUrl}
								onChange={(e) => setWebhookUrl(e.target.value)}
							/>
						</div>
						<Button onClick={saveWebhookSettings} variant="secondary">
							Save Webhook Settings
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
