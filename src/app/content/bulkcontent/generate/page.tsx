"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Copy, FileDown, Save } from "lucide-react";
import { toast } from "react-hot-toast";
import { IWebsite as Website } from "@/models/Website";

interface OutlineItem {
	content: string;
	level: "h2" | "h3" | "h4";
}

interface ContentEntry {
	id: string;
	keyword: string;
	title: string;
	contentType: string;
	outline: OutlineItem[];
	isExpanded: boolean;
	content?: string;
	currentSection?: string;
	wordCount?: number;
	status: "pending" | "generating" | "completed" | "error";
	relatedKeywords?: string[];
}

interface BulkContentData {
	entries: ContentEntry[];
	language: string;
	targetCountry: string;
	selectedWebsite: Website;
}

export default function BulkGenerateContentPage() {
	const router = useRouter();
	const [entries, setEntries] = useState<ContentEntry[]>([]);
	const [bulkData, setBulkData] = useState<BulkContentData | null>(null);
	const [currentEntryIndex, setCurrentEntryIndex] = useState<number>(0);

	useEffect(() => {
		const storedData = localStorage.getItem("bulkContentOutlines");
		if (!storedData) {
			router.push("/content/bulkcontent/outline");
			return;
		}

		try {
			const parsedData: BulkContentData = JSON.parse(storedData);
			const entriesWithStatus = parsedData.entries.map((entry) => ({
				...entry,
				status: "pending" as const,
				content: "",
				wordCount: 0,
			}));
			setEntries(entriesWithStatus);
			setBulkData(parsedData);
		} catch (error) {
			console.error("Error parsing stored data:", error);
			router.push("/content/bulkcontent/outline");
		}
	}, [router]);

	useEffect(() => {
		const generateContent = async () => {
			if (!bulkData || currentEntryIndex >= entries.length) return;

			const entry = entries[currentEntryIndex];
			if (entry.status !== "pending") return;

			setEntries((prev) =>
				prev.map((e, i) =>
					i === currentEntryIndex ? { ...e, status: "generating" } : e
				)
			);

			const decoder = new TextDecoder();
			let buffer = "";
			let fullContent = "";
			let wordCount = 0;

			try {
				const response = await fetch("/api/content", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						keyword: entry.keyword,
						title: entry.title,
						outline: entry.outline,
						language: bulkData.language,
						targetCountry: bulkData.targetCountry,
						relatedKeywords: entry.relatedKeywords || [],
						companyInfo: {
							name: bulkData.selectedWebsite.name,
							website: bulkData.selectedWebsite.website,
							description: bulkData.selectedWebsite.description,
							summary: bulkData.selectedWebsite.summary,
							toneofvoice: bulkData.selectedWebsite.toneofvoice,
							targetAudience: bulkData.selectedWebsite.targetAudience,
						},
					}),
				});

				if (!response.ok)
					throw new Error(`HTTP error! status: ${response.status}`);
				if (!response.body) throw new Error("Response body is null");

				const reader = response.body.getReader();

				try {
					while (true) {
						const { done, value } = await reader.read();

						if (done) break;

						const chunk = decoder.decode(value, { stream: true });
						buffer += chunk;

						const lines = buffer.split("\n");
						buffer = lines.pop() || "";

						for (const line of lines) {
							if (line.trim() === "") continue;

							if (line.startsWith("data: ")) {
								const data = line.slice(5);

								if (data === "[DONE]") break;

								try {
									const parsed = JSON.parse(data);

									if (parsed.section && parsed.isProgress) {
										setEntries((prev) =>
											prev.map((e, i) =>
												i === currentEntryIndex
													? { ...e, currentSection: parsed.section }
													: e
											)
										);
									}

									if (parsed.content) {
										fullContent += parsed.content;
										wordCount = fullContent.trim().split(/\s+/).length;
										setEntries((prev) =>
											prev.map((e, i) =>
												i === currentEntryIndex
													? {
															...e,
															content: fullContent,
															wordCount,
													  }
													: e
											)
										);
									}
								} catch (e) {
									console.error("Error parsing JSON:", e);
								}
							}
						}
					}
				} finally {
					reader.releaseLock();
					setEntries((prev) =>
						prev.map((e, i) =>
							i === currentEntryIndex
								? {
										...e,
										status: "completed",
										content: fullContent,
										wordCount,
										currentSection: undefined,
								  }
								: e
						)
					);
					setCurrentEntryIndex((prev) => prev + 1);
				}
			} catch (error) {
				console.error("Error generating content:", error);
				setEntries((prev) =>
					prev.map((e, i) =>
						i === currentEntryIndex
							? { ...e, status: "error", currentSection: undefined }
							: e
					)
				);
				toast.error(
					`Failed to generate content for "${entry.title}". Please try again.`
				);
				setCurrentEntryIndex((prev) => prev + 1);
			}
		};

		generateContent();
	}, [bulkData, currentEntryIndex, entries]);

	const handleBack = () => {
		router.push("/content/bulkcontent/outline");
	};

	const handleCopyContent = async (content: string) => {
		try {
			await navigator.clipboard.writeText(content);
			toast.success("Content copied to clipboard!");
		} catch (err) {
			toast.error("Failed to copy content");
		}
	};

	const handleExportHTML = (entry: ContentEntry) => {
		const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${entry.title}</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #333;
        }
        h1 { font-size: 2.5rem; margin-bottom: 1.5rem; }
        h2 { font-size: 2rem; margin-top: 2rem; margin-bottom: 1rem; }
        h3 { font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        p { margin-bottom: 1rem; }
        ul, ol { margin-bottom: 1rem; padding-left: 2rem; }
        li { margin-bottom: 0.5rem; }
    </style>
</head>
<body>
    ${entry.content}
</body>
</html>`;

		const blob = new Blob([htmlContent], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${entry.title}.html`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		toast.success("Content exported as HTML!");
	};

	const handleSaveContent = async (entry: ContentEntry) => {
		if (!entry.content || !bulkData?.selectedWebsite) {
			toast.error("No content to save");
			return;
		}

		try {
			const contentData = {
				title: entry.title,
				html: entry.content,
				status: "Draft",
				contentType: entry.contentType,
				mainKeyword: entry.keyword,
				websiteId: bulkData.selectedWebsite._id,
			};

			const response = await fetch("/api/content/save", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(contentData),
			});

			if (!response.ok) {
				throw new Error("Failed to save content");
			}

			toast.success(`"${entry.title}" saved successfully!`);
			setEntries((prev) =>
				prev.map((e) => (e.id === entry.id ? { ...e, isSaved: true } : e))
			);
		} catch (error) {
			console.error("Error saving content:", error);
			toast.error(`Failed to save "${entry.title}"`);
		}
	};

	const handleSaveAll = async () => {
		const completedEntries = entries.filter((e) => e.status === "completed");
		if (completedEntries.length === 0) {
			toast.error("No completed content to save");
			return;
		}

		let successCount = 0;
		let errorCount = 0;

		for (const entry of completedEntries) {
			try {
				await handleSaveContent(entry);
				successCount++;
			} catch (error) {
				console.error(`Error saving ${entry.title}:`, error);
				errorCount++;
			}
		}

		if (successCount > 0) {
			toast.success(`Successfully saved ${successCount} pieces of content`);
		}
		if (errorCount > 0) {
			toast.error(`Failed to save ${errorCount} pieces of content`);
		}
	};

	const getTotalProgress = () => {
		const completed = entries.filter(
			(e) => e.status === "completed" || e.status === "error"
		).length;
		return Math.round((completed / entries.length) * 100);
	};

	return (
		<main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto bg-[#f8f9fa]">
			<Card className="bg-white border shadow-sm">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
					<div className="flex items-center gap-4">
						<Button variant="ghost" size="icon" onClick={handleBack}>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<CardTitle className="text-2xl font-bold text-gray-900">
							Bulk Content Generation
						</CardTitle>
					</div>
					<div className="flex items-center gap-4">
						<div className="text-sm text-gray-500">
							Progress: {getTotalProgress()}%
						</div>
						{entries.some((e) => e.status === "completed") && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleSaveAll}
								className="flex items-center gap-2">
								<Save className="h-4 w-4" />
								Save All
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="pt-6">
					<div className="space-y-6">
						{entries.map((entry, index) => (
							<Card
								key={entry.id}
								className={`border ${
									entry.status === "completed"
										? "bg-green-50"
										: entry.status === "error"
										? "bg-red-50"
										: "bg-gray-50"
								}`}>
								<CardContent className="pt-6">
									<div className="flex justify-between items-start mb-4">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<Badge variant="secondary">Content #{index + 1}</Badge>
												<Badge
													variant={
														entry.status === "completed"
															? "secondary"
															: entry.status === "error"
															? "destructive"
															: "secondary"
													}>
													{entry.status.charAt(0).toUpperCase() +
														entry.status.slice(1)}
												</Badge>
											</div>
											<h3 className="text-lg font-semibold">{entry.title}</h3>
										</div>
										{entry.status === "completed" && (
											<div className="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleCopyContent(entry.content!)}>
													<Copy className="h-4 w-4" />
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleExportHTML(entry)}>
													<FileDown className="h-4 w-4" />
												</Button>
												<Button
													variant="secondary"
													size="sm"
													onClick={() => handleSaveContent(entry)}>
													<Save className="h-4 w-4" />
												</Button>
											</div>
										)}
									</div>

									{entry.status === "generating" && (
										<div className="flex flex-col items-center justify-center py-8">
											<Loader2 className="h-8 w-4 animate-spin text-gray-500 mb-4" />
											<p className="text-gray-500 mb-2">
												{entry.currentSection
													? `Generating ${entry.currentSection}...`
													: "Preparing content..."}
											</p>
											{entry.wordCount && entry.wordCount > 0 && (
												<p className="text-sm text-gray-500">
													{entry.wordCount} words generated
												</p>
											)}
										</div>
									)}

									{entry.status === "completed" && entry.content && (
										<div className="prose prose-lg max-w-none mt-4">
											<div
												dangerouslySetInnerHTML={{
													__html: entry.content,
												}}
												className="space-y-4"
											/>
										</div>
									)}

									{entry.status === "error" && (
										<div className="text-center py-8 text-red-500">
											Failed to generate content. Please try again.
										</div>
									)}
								</CardContent>
							</Card>
						))}
					</div>
				</CardContent>
			</Card>
		</main>
	);
}
