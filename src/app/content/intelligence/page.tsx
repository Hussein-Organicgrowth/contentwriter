"use client";

import { useState } from "react";
import {
	BookOpenCheck,
	LinkIcon,
	FileInput,
	Wand2,
	AlertCircle,
	PercentIcon,
	InfoIcon,
	ChevronDownIcon,
	ChevronUpIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";

// Type for the processed page data from API
interface ProcessedPageItem {
	url: string;
	h1: string | null;
	summary: string;
	toneOfVoice: string;
	status: string;
	error?: string;
}

// Display item type (includes client-generated ID for React keys)
interface ProcessedPageDisplayItem extends ProcessedPageItem {
	id: string;
}

// API Stats interface
interface ProcessingStats {
	total: number;
	success: number;
	errors: number;
	originalUrlCount: number;
	sampled: boolean;
}

// Initial empty state
const emptyProcessedPages: ProcessedPageDisplayItem[] = [];

export default function ContentIntelligencePage() {
	const [sitemapUrl, setSitemapUrl] = useState("");
	const [processedPages, setProcessedPages] =
		useState<ProcessedPageDisplayItem[]>(emptyProcessedPages);
	const [isLoading, setIsLoading] = useState(false);
	const [apiError, setApiError] = useState<string | null>(null);
	const [indexingCompleted, setIndexingCompleted] = useState(false);
	const [processingStats, setProcessingStats] =
		useState<ProcessingStats | null>(null);
	const [enableSampling, setEnableSampling] = useState(true);
	const [sampleSize, setSampleSize] = useState(10); // Default 10% sampling

	const handleIndexSitemap = async () => {
		// Reset states
		setIsLoading(true);
		setApiError(null);
		setIndexingCompleted(false);
		setProcessedPages([]);
		setProcessingStats(null);

		try {
			const response = await fetch("/api/index-sitemap", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					sitemapUrl,
					// Only include sampleSize if sampling is enabled
					...(enableSampling && { sampleSize }),
				}),
			});

			if (!response.ok) {
				// Try to get error details from response
				let errorDetails = "";
				try {
					const errorData = await response.json();
					errorDetails = errorData.error || errorData.details || "";
				} catch (e) {
					// If we can't parse the JSON, just use the status text
					errorDetails = "";
				}

				throw new Error(
					`Failed to index sitemap: ${response.status} ${response.statusText} ${
						errorDetails ? "- " + errorDetails : ""
					}`
				);
			}

			const data = await response.json();

			// Process the data to add client-side IDs for React keys
			const processedData: ProcessedPageDisplayItem[] = data.pages.map(
				(item: ProcessedPageItem, index: number) => ({
					...item,
					id: `page-${Date.now()}-${index}`,
					// Map API statuses to our UI statuses if needed
					status:
						item.status === "Processed"
							? "Indexed"
							: item.status === "Error fetching page" ||
							  item.status === "Error parsing page"
							? "Error"
							: "Processing",
				})
			);

			setProcessedPages(processedData);
			setProcessingStats(data.stats);
			setIndexingCompleted(true);
		} catch (error: any) {
			console.error("Error indexing sitemap:", error);
			setApiError(
				error.message || "An error occurred while indexing the sitemap."
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10 p-4 md:p-8 lg:p-12">
			<div className="mx-auto max-w-7xl">
				<div className="mb-12 space-y-6">
					<div className="text-center space-y-4">
						<div className="inline-flex items-center gap-2 px-6 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-2">
							<FileInput className="h-5 w-5" /> Sitemap Indexing
						</div>
						<h1 className="text-4xl font-bold tracking-tight md:text-6xl text-foreground">
							Content Intelligence Hub
						</h1>
						<p className="mt-4 text-muted-foreground text-lg max-w-3xl mx-auto">
							Provide your sitemap URL to index your website. This allows the AI
							to gain a comprehensive understanding of your content, improving
							the relevance and coherence of generated material.
						</p>
					</div>

					<Card className="max-w-2xl mx-auto shadow-md border-border/40">
						<CardHeader>
							<div className="flex items-center space-x-3">
								<LinkIcon className="h-6 w-6 text-primary" />
								<CardTitle>Index Your Website</CardTitle>
							</div>
							<CardDescription>
								Enter the full URL of your sitemap.xml file.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex flex-col sm:flex-row gap-2">
								<Input
									type="url"
									placeholder="https://example.com/sitemap.xml"
									value={sitemapUrl}
									onChange={(e) => setSitemapUrl(e.target.value)}
									className="flex-grow"
									disabled={isLoading}
								/>
								<Button
									onClick={handleIndexSitemap}
									disabled={isLoading || !sitemapUrl}
									className="w-full sm:w-auto">
									<Wand2 className="mr-2 h-4 w-4" />
									{isLoading ? "Indexing..." : "Start Indexing"}
								</Button>
							</div>

							<Accordion
								type="single"
								collapsible
								defaultValue="sampling"
								className="w-full">
								<AccordionItem value="sampling">
									<AccordionTrigger className="text-sm font-medium">
										<div className="flex items-center gap-2">
											<PercentIcon className="h-4 w-4 text-muted-foreground" />
											<span>
												Sampling Settings{" "}
												<span className="text-muted-foreground">
													(for large sitemaps)
												</span>
											</span>
										</div>
									</AccordionTrigger>
									<AccordionContent>
										<div className="space-y-3 pt-2">
											<div className="flex items-center justify-between">
												<label className="text-sm font-medium leading-none space-x-2 flex items-center cursor-pointer">
													<input
														type="checkbox"
														checked={enableSampling}
														onChange={(e) =>
															setEnableSampling(e.target.checked)
														}
														className="rounded border-gray-300"
														disabled={isLoading}
													/>
													<span>Enable sampling</span>
												</label>
												<span className="text-sm text-muted-foreground">
													{enableSampling ? `${sampleSize}%` : "Off"}
												</span>
											</div>

											{enableSampling && (
												<div className="pt-1">
													<Slider
														value={[sampleSize]}
														min={1}
														max={100}
														step={1}
														disabled={isLoading || !enableSampling}
														onValueChange={(values) => setSampleSize(values[0])}
														className="py-2"
													/>
													<div className="flex justify-between text-xs text-muted-foreground">
														<span>1%</span>
														<span>50%</span>
														<span>100%</span>
													</div>
													<p className="text-xs text-muted-foreground pt-2">
														<InfoIcon className="h-3 w-3 inline mr-1" />
														For very large sitemaps, sampling processes a
														smaller representative set of pages. This
														significantly improves processing speed.
													</p>
												</div>
											)}
										</div>
									</AccordionContent>
								</AccordionItem>
							</Accordion>

							{apiError && (
								<Alert variant="destructive" className="mt-4">
									<AlertCircle className="h-4 w-4" />
									<AlertTitle>Error</AlertTitle>
									<AlertDescription>{apiError}</AlertDescription>
								</Alert>
							)}

							{isLoading && (
								<div className="mt-4 space-y-2">
									<div className="flex justify-between text-sm">
										<span>Processing sitemap</span>
										<span>Please wait...</span>
									</div>
									<Progress value={33} className="h-2" />
									<p className="text-xs text-muted-foreground pt-1">
										This might take several minutes for large sitemaps
									</p>
								</div>
							)}

							{indexingCompleted && processingStats && (
								<Alert className="mt-4 bg-green-500/10 text-green-700 border-green-500/30">
									<AlertCircle className="h-4 w-4" />
									<AlertTitle>Processing Complete</AlertTitle>
									<AlertDescription>
										<p className="mb-1">
											Successfully processed {processingStats.total} URLs from
											the sitemap.
										</p>
										<div className="text-xs space-y-1 mt-2">
											<div className="flex justify-between">
												<span>Success:</span>
												<span>
													{processingStats.success} (
													{Math.round(
														(processingStats.success / processingStats.total) *
															100
													)}
													%)
												</span>
											</div>
											<div className="flex justify-between">
												<span>Errors:</span>
												<span>
													{processingStats.errors} (
													{Math.round(
														(processingStats.errors / processingStats.total) *
															100
													)}
													%)
												</span>
											</div>
											{processingStats.sampled && (
												<div className="flex justify-between">
													<span>Sampling applied:</span>
													<span>
														{Math.round(
															(processingStats.total /
																processingStats.originalUrlCount) *
																100
														)}
														% of {processingStats.originalUrlCount} URLs
													</span>
												</div>
											)}
										</div>
									</AlertDescription>
								</Alert>
							)}
						</CardContent>
					</Card>
				</div>

				<Card className="shadow-lg border-border/40">
					<CardHeader>
						<div className="flex items-center space-x-3 mb-2">
							<BookOpenCheck className="h-8 w-8 text-primary" />
							<CardTitle className="text-2xl">
								Indexed Content Overview
							</CardTitle>
						</div>
						<CardDescription>
							A list of content pieces from your sitemap that the AI is using as
							a knowledge base.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading && (
							<div className="text-center py-8 text-muted-foreground">
								<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
								<p>Processing sitemap - this may take a few moments...</p>
							</div>
						)}

						{!isLoading && (
							<div className="overflow-hidden rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[25%]">URL</TableHead>
											<TableHead className="w-[15%]">H1</TableHead>
											<TableHead className="w-[35%]">Summary</TableHead>
											<TableHead className="w-[15%]">Tone of Voice</TableHead>
											<TableHead className="text-right">Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{processedPages.length > 0 ? (
											processedPages.map((item) => (
												<TableRow key={item.id} className="hover:bg-muted/50">
													<TableCell>
														<a
															href={item.url}
															target="_blank"
															rel="noopener noreferrer"
															className="text-primary hover:underline truncate max-w-[250px] block"
															title={item.url}>
															{item.url}
														</a>
													</TableCell>
													<TableCell
														className="font-medium truncate max-w-[150px]"
														title={item.h1 || ""}>
														{item.h1 || "No H1 found"}
													</TableCell>
													<TableCell
														className="text-sm text-muted-foreground truncate max-w-[300px]"
														title={item.summary}>
														{item.summary}
													</TableCell>
													<TableCell>{item.toneOfVoice}</TableCell>
													<TableCell className="text-right">
														<Badge
															variant={
																item.status === "Indexed"
																	? "default"
																	: item.status === "Processing"
																	? "outline"
																	: "destructive"
															}
															className={
																item.status === "Indexed"
																	? "bg-green-500/10 text-green-700 border-green-500/30"
																	: item.status === "Processing"
																	? "bg-blue-500/10 text-blue-700 border-blue-500/30"
																	: "bg-red-500/10 text-red-700 border-red-500/30"
															}
															title={item.error ? item.error : ""}>
															{item.status}
														</Badge>
													</TableCell>
												</TableRow>
											))
										) : (
											<TableRow>
												<TableCell
													colSpan={5}
													className="text-center text-muted-foreground py-8">
													No content has been indexed yet. Enter a sitemap URL
													to begin.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
					{processedPages.length > 0 && processingStats && (
						<CardFooter className="text-xs text-muted-foreground pt-2 pb-6">
							{processingStats.sampled
								? `Showing ${processedPages.length} sampled pages from a total of ${processingStats.originalUrlCount} URLs found in the sitemap.`
								: `Showing all ${processedPages.length} pages from the sitemap.`}
						</CardFooter>
					)}
				</Card>
			</div>
		</div>
	);
}
