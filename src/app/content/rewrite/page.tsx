"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Loader2,
	Plus,
	X,
	Copy,
	Download,
	RefreshCw,
	Link as LinkIcon,
	AlertCircle,
	CheckCircle2,
	AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function RewritePage() {
	const [url, setUrl] = useState("");
	const [content, setContent] = useState("");
	const [mainKeyword, setMainKeyword] = useState("");
	const [newKeyword, setNewKeyword] = useState("");
	const [relatedKeywords, setRelatedKeywords] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [rewrittenContent, setRewrittenContent] = useState("");
	const [activeTab, setActiveTab] = useState("url");
	const [progress, setProgress] = useState(0);
	const [wordCount, setWordCount] = useState({ original: 0, rewritten: 0 });
	const [contentType, setContentType] = useState<"text" | "html">("text");
	const [htmlPreview, setHtmlPreview] = useState("");

	// Calculate word count
	const calculateWordCount = (text: string) => {
		return text.trim().split(/\s+/).filter(Boolean).length;
	};

	// Update word counts when content changes
	const updateWordCounts = () => {
		setWordCount({
			original: calculateWordCount(content),
			rewritten: calculateWordCount(rewrittenContent.replace(/<[^>]+>/g, "")),
		});
	};

	const handleUrlFetch = async () => {
		if (!url) {
			toast.error("Please enter a URL");
			return;
		}

		setIsLoading(true);
		setProgress(20);
		try {
			const response = await fetch("/api/content/fetch-url", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url }),
			});

			setProgress(60);
			if (!response.ok) throw new Error("Failed to fetch content");

			const data = await response.json();
			setContent(data.content);
			if (data.contentType === "html") {
				setContentType("html");
				setHtmlPreview(data.content);
			} else {
				setContentType("text");
				setHtmlPreview("");
			}
			updateWordCounts();
			toast.success("Content fetched successfully");
			setProgress(100);
		} catch (error) {
			console.error("Error fetching URL:", error);
			toast.error("Failed to fetch content from URL");
		} finally {
			setIsLoading(false);
			setTimeout(() => setProgress(0), 500);
		}
	};

	const handleAddKeyword = () => {
		if (newKeyword.trim()) {
			if (relatedKeywords.includes(newKeyword.trim())) {
				toast.error("This keyword already exists");
				return;
			}
			setRelatedKeywords((prev) => [...prev, newKeyword.trim()]);
			setNewKeyword("");
		}
	};

	const removeKeyword = (indexToRemove: number) => {
		setRelatedKeywords((prev) =>
			prev.filter((_, index) => index !== indexToRemove)
		);
	};

	const handleRewrite = async () => {
		if (!content) {
			toast.error("Please provide content to rewrite");
			return;
		}

		if (!mainKeyword) {
			toast.error("Please specify a main keyword");
			return;
		}

		setIsLoading(true);
		setProgress(20);
		setRewrittenContent(""); // Clear previous content

		try {
			const response = await fetch("/api/content/rewrite", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					content,
					mainKeyword,
					relatedKeywords,
				}),
			});

			if (!response.ok) throw new Error("Failed to rewrite content");
			if (!response.body) throw new Error("No response body");

			setProgress(40);

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			try {
				while (true) {
					const { done, value } = await reader.read();

					if (done) {
						console.log("Stream complete");
						break;
					}

					// Decode the chunk and add to buffer
					const chunk = decoder.decode(value, { stream: true });
					buffer += chunk;

					// Process complete SSE messages
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (line.trim() === "") continue;
						if (line.startsWith("data: ")) {
							const data = line.slice(5);

							if (data === "[DONE]") {
								setProgress(100);
								continue;
							}

							try {
								const parsed = JSON.parse(data);
								if (parsed.content) {
									setRewrittenContent(parsed.content);
									updateWordCounts();
									// Increment progress smoothly
									setProgress((prev) => Math.min(95, prev + 1));
								}
							} catch (e) {
								console.error("Error parsing JSON:", e);
							}
						}
					}
				}
			} finally {
				reader.releaseLock();
			}

			toast.success("Content rewritten successfully");
		} catch (error) {
			console.error("Error rewriting content:", error);
			toast.error("Failed to rewrite content");
		} finally {
			setIsLoading(false);
			setTimeout(() => setProgress(0), 500);
		}
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(rewrittenContent);
			toast.success("Content copied to clipboard");
		} catch (error) {
			toast.error("Failed to copy content");
		}
	};

	const handleDownload = () => {
		const blob = new Blob([rewrittenContent], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `rewritten-content-${
			new Date().toISOString().split("T")[0]
		}.html`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		toast.success("Content downloaded successfully");
	};

	const processHtmlContent = (content: string) => {
		try {
			// Create a DOMParser to parse HTML content
			const parser = new DOMParser();
			const doc = parser.parseFromString(content, "text/html");

			// Clean up the HTML
			const scripts = doc.getElementsByTagName("script");
			const styles = doc.getElementsByTagName("style");
			[...scripts, ...styles].forEach((element) => element.remove());

			// Extract main content
			const body = doc.body;
			let cleanHtml = body.innerHTML
				.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
				.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
				.replace(/<!--[\s\S]*?-->/g, "")
				.replace(/\s+/g, " ")
				.trim();

			// Normalize headings and paragraphs
			cleanHtml = cleanHtml
				.replace(/<(\/?)h[1-6]/g, "<$1h2") // Convert all headings to h2
				.replace(/<br\s*\/?>/g, "</p><p>") // Convert br to paragraphs
				.replace(/<div([^>]*)>/g, "<p>") // Convert divs to paragraphs
				.replace(/<\/div>/g, "</p>")
				.replace(/<p>\s*<\/p>/g, "") // Remove empty paragraphs
				.replace(/(<p>)\s*(<p>)/g, "$1") // Remove nested paragraphs
				.replace(/(<\/p>)\s*(<\/p>)/g, "$1");

			// Ensure content starts and ends with proper tags
			if (!cleanHtml.startsWith("<")) {
				cleanHtml = `<p>${cleanHtml}`;
			}
			if (!cleanHtml.endsWith(">")) {
				cleanHtml = `${cleanHtml}</p>`;
			}

			setContent(cleanHtml);
			setHtmlPreview(cleanHtml);
			updateWordCounts();

			// Analyze HTML structure
			const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6").length;
			const paragraphs = doc.querySelectorAll("p").length;
			const lists = doc.querySelectorAll("ul, ol").length;

			if (headings === 0) {
				toast(
					"No headings detected. Consider adding some structure to your content.",
					{
						icon: "⚠️",
						duration: 4000,
					}
				);
			}

			return true;
		} catch (error) {
			console.error("Error processing HTML:", error);
			return false;
		}
	};

	const handleContentPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newContent = e.target.value;

		if (newContent.trim().startsWith("<")) {
			// Content appears to be HTML
			if (processHtmlContent(newContent)) {
				setContentType("html");
			} else {
				setContent(newContent);
				setContentType("text");
			}
		} else {
			// Plain text content
			setContent(newContent);
			setContentType("text");
		}

		updateWordCounts();
	};

	return (
		<main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto bg-[#f8f9fa]">
			{progress > 0 && (
				<Progress
					value={progress}
					className="h-1 fixed top-0 left-0 right-0 z-50 transition-all"
				/>
			)}
			<div className="grid gap-6">
				<Card className="bg-white border shadow-sm">
					<CardHeader className="border-b">
						<CardTitle className="text-2xl font-bold text-gray-900">
							Content Rewriter
						</CardTitle>
					</CardHeader>
					<CardContent className="pt-6 space-y-8">
						{/* Content Input Section */}
						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<Label className="text-lg font-semibold">Source Content</Label>
								{content && (
									<Badge variant="secondary">{wordCount.original} words</Badge>
								)}
							</div>
							<Tabs value={activeTab} onValueChange={setActiveTab}>
								<TabsList className="mb-4">
									<TabsTrigger value="url" className="flex items-center gap-2">
										<LinkIcon className="h-4 w-4" />
										From URL
									</TabsTrigger>
									<TabsTrigger
										value="paste"
										className="flex items-center gap-2">
										<svg
											className="h-4 w-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
											/>
										</svg>
										Paste Content
									</TabsTrigger>
								</TabsList>
								<TabsContent value="url" className="space-y-4">
									<div className="flex gap-2">
										<Input
											value={url}
											onChange={(e) => setUrl(e.target.value)}
											placeholder="Enter URL..."
											className="flex-1"
										/>
										<Button
											onClick={handleUrlFetch}
											disabled={isLoading || !url}
											variant="secondary"
											className="min-w-[100px]">
											{isLoading ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												"Fetch"
											)}
										</Button>
									</div>
								</TabsContent>
								<TabsContent value="paste">
									<div className="space-y-4">
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<AlertTriangle className="h-4 w-4" />
											<span>
												{contentType === "html"
													? "HTML content detected. Structure and formatting will be preserved."
													: "Paste content with HTML tags to preserve structure and formatting."}
											</span>
										</div>
										<ScrollArea className="h-[200px] w-full rounded-md border">
											<Textarea
												value={content}
												onChange={handleContentPaste}
												placeholder="Paste your content here... HTML content is supported for better structure preservation."
												className="min-h-[200px] border-0 font-mono text-sm"
											/>
										</ScrollArea>
										{contentType === "html" && htmlPreview && (
											<Card className="mt-4 bg-gray-50">
												<CardHeader className="py-2">
													<CardTitle className="text-sm font-medium">
														Content Preview
													</CardTitle>
												</CardHeader>
												<CardContent>
													<ScrollArea className="h-[200px]">
														<div
															className="prose prose-sm max-w-none"
															dangerouslySetInnerHTML={{ __html: htmlPreview }}
														/>
													</ScrollArea>
												</CardContent>
											</Card>
										)}
									</div>
								</TabsContent>
							</Tabs>
						</div>

						{/* Keywords Section */}
						<div className="grid md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label className="text-lg font-semibold">Main Keyword</Label>
								<Input
									value={mainKeyword}
									onChange={(e) => setMainKeyword(e.target.value)}
									placeholder="Enter main keyword..."
									className="mt-2"
								/>
							</div>

							<div className="space-y-2">
								<Label className="text-lg font-semibold">
									Related Keywords{" "}
									{relatedKeywords.length > 0 && (
										<span className="text-sm text-gray-500">
											({relatedKeywords.length})
										</span>
									)}
								</Label>
								<div className="flex gap-2">
									<Input
										value={newKeyword}
										onChange={(e) => setNewKeyword(e.target.value)}
										placeholder="Add related keyword..."
										onKeyPress={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleAddKeyword();
											}
										}}
									/>
									<Button
										onClick={handleAddKeyword}
										disabled={!newKeyword.trim()}
										variant="secondary"
										className="shrink-0">
										<Plus className="h-4 w-4" />
									</Button>
								</div>
								<ScrollArea className="h-[100px] w-full rounded-md border p-4">
									<div className="flex flex-wrap gap-2">
										{relatedKeywords.map((keyword, index) => (
											<Badge
												key={index}
												variant="secondary"
												className="flex items-center gap-1">
												{keyword}
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="h-4 w-4 p-0 hover:text-red-500"
													onClick={() => removeKeyword(index)}>
													<X className="h-3 w-3" />
												</Button>
											</Badge>
										))}
									</div>
								</ScrollArea>
							</div>
						</div>

						{/* Action Button */}
						<div className="flex flex-col gap-4">
							{!content && (
								<Alert>
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>
										Please provide content to rewrite by either fetching from a
										URL or pasting directly.
									</AlertDescription>
								</Alert>
							)}
							<Button
								onClick={handleRewrite}
								disabled={isLoading || !content || !mainKeyword}
								className="w-full"
								variant="secondary"
								size="lg">
								{isLoading ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin mr-2" />
										Rewriting Content...
									</>
								) : (
									<>
										<RefreshCw className="h-4 w-4 mr-2" />
										Rewrite Content
									</>
								)}
							</Button>
						</div>

						{/* Results Section */}
						{rewrittenContent && (
							<div className="space-y-4">
								<div className="flex justify-between items-center">
									<Label className="text-lg font-semibold">
										Rewritten Content
									</Label>
									<div className="flex items-center gap-4">
										<Badge variant="secondary" className="flex gap-2">
											<CheckCircle2 className="h-4 w-4" />
											{wordCount.rewritten} words
										</Badge>
										<div className="flex gap-2">
											<Button variant="outline" size="sm" onClick={handleCopy}>
												<Copy className="h-4 w-4 mr-2" />
												Copy
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={handleDownload}>
												<Download className="h-4 w-4 mr-2" />
												Download
											</Button>
										</div>
									</div>
								</div>
								<Card className="bg-gray-50">
									<ScrollArea className="h-[500px]">
										<CardContent className="pt-6">
											<div
												className="prose prose-lg max-w-none"
												dangerouslySetInnerHTML={{ __html: rewrittenContent }}
											/>
										</CardContent>
									</ScrollArea>
								</Card>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
