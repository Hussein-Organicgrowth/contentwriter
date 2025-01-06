"use client";

import { useState, useEffect } from "react";
import { LANGUAGES, COUNTRIES } from "@/lib/localization";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	Loader2,
	Plus,
	Trash2,
	ChevronDown,
	ChevronUp,
	ListPlus,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { IWebsite as Website } from "@/models/Website";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const CONTENT_TYPES = [
	{
		value: "article",
		label: "Article",
		description: "In-depth, informative content with multiple sections",
	},
	{
		value: "blog",
		label: "Blog Post",
		description: "Engaging, conversational content with personal insights",
	},
	{
		value: "landing_page",
		label: "Landing Page",
		description: "Persuasive content focused on conversion",
	},
	{
		value: "service_page",
		label: "Service Page",
		description: "Detailed information about a specific service",
	},
	{
		value: "category_page",
		label: "Category Page",
		description: "Overview content for product/service categories",
	},
];

interface ContentEntry {
	id: string;
	keyword: string;
	title: string;
	contentType: string;
	isExpanded: boolean;
	isGeneratingTitle?: boolean;
	includeBusinessName: boolean;
}

export default function BulkContent() {
	const router = useRouter();
	const [entries, setEntries] = useState<ContentEntry[]>([]);
	const [language, setLanguage] = useState("en-US");
	const [targetCountry, setTargetCountry] = useState("US");
	const [website, setWebsite] = useState<Website[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
	const [bulkKeywords, setBulkKeywords] = useState("");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [bulkContentType, setBulkContentType] = useState("article");
	const [isBulkGenerating, setIsBulkGenerating] = useState(false);

	useEffect(() => {
		const fetchWebsites = async () => {
			setIsLoading(true);
			try {
				const response = await fetch("/api/website");
				const data = await response.json();
				if (data.websites) {
					setWebsite(data.websites);

					const companyName = localStorage.getItem("company");
					if (companyName) {
						const matchedWebsite = data.websites.find(
							(w: Website) => w.name.toLowerCase() === companyName.toLowerCase()
						);

						if (matchedWebsite) {
							setSelectedWebsite(matchedWebsite);
						} else {
							toast.error(`No website found for company: ${companyName}`);
						}
					} else {
						toast.error("Company name not found in localStorage.");
					}
				}
			} catch (error) {
				console.error("Error fetching websites:", error);
				toast.error("Failed to fetch websites");
			}
			setIsLoading(false);
		};

		fetchWebsites();
	}, []);

	const addNewEntry = () => {
		const newEntry: ContentEntry = {
			id: Date.now().toString(),
			keyword: "",
			title: "",
			contentType: "article",
			isExpanded: true,
			includeBusinessName: false,
		};
		setEntries([...entries, newEntry]);
	};

	const removeEntry = (id: string) => {
		setEntries(entries.filter((entry) => entry.id !== id));
	};

	const updateEntry = (
		id: string,
		field: keyof ContentEntry,
		value: string
	) => {
		setEntries(
			entries.map((entry) =>
				entry.id === id ? { ...entry, [field]: value } : entry
			)
		);
	};

	const toggleExpand = (id: string) => {
		setEntries(
			entries.map((entry) =>
				entry.id === id ? { ...entry, isExpanded: !entry.isExpanded } : entry
			)
		);
	};

	const handleGenerateTitle = async (id: string) => {
		const entry = entries.find((e) => e.id === id);
		if (!entry?.keyword) return;

		// Set loading state for this specific entry
		setEntries((prev) =>
			prev.map((e) => (e.id === id ? { ...e, isGeneratingTitle: true } : e))
		);

		try {
			const response = await fetch("/api/title", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					keyword: entry.keyword,
					language,
					targetCountry,
					contentType: entry.contentType,
					businessName: entry.includeBusinessName
						? selectedWebsite?.name
						: undefined,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to generate title");
			}

			const data = await response.json();
			if (data.title) {
				updateEntry(id, "title", data.title);
				toast.success("Title generated successfully!");
			}
		} catch (error) {
			console.error("Error:", error);
			toast.error("Failed to generate title");
		} finally {
			// Clear loading state
			setEntries((prev) =>
				prev.map((e) => (e.id === id ? { ...e, isGeneratingTitle: false } : e))
			);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (entries.length === 0) {
			toast.error("Please add at least one content entry");
			return;
		}

		const hasEmptyFields = entries.some(
			(entry) => !entry.keyword || !entry.title || !entry.contentType
		);

		if (hasEmptyFields) {
			toast.error("Please fill in all required fields");
			return;
		}

		// Store the entries in localStorage
		localStorage.setItem(
			"bulkContentEntries",
			JSON.stringify({
				entries,
				language,
				targetCountry,
				selectedWebsite,
			})
		);

		// Navigate to the next step (outline generation)
		router.push("/content/bulkcontent/outline");
	};

	const handleBulkAdd = () => {
		const keywords = bulkKeywords
			.split("\n")
			.map((k) => k.trim())
			.filter((k) => k !== "");

		if (keywords.length === 0) {
			toast.error("Please enter at least one keyword");
			return;
		}

		const newEntries = keywords.map((keyword) => ({
			id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
			keyword,
			title: "",
			contentType: bulkContentType,
			isExpanded: true,
			includeBusinessName: false,
		}));

		setEntries((prev) => [...prev, ...newEntries]);
		setBulkKeywords("");
		setBulkContentType("article"); // Reset to default
		setIsDialogOpen(false);
		toast.success(`Added ${keywords.length} new keywords`);
	};

	const handleBulkGenerateTitles = async () => {
		const entriesToGenerate = entries.filter(
			(entry) => entry.keyword && !entry.isGeneratingTitle
		);

		if (entriesToGenerate.length === 0) {
			toast.error("No entries found with keywords");
			return;
		}

		setIsBulkGenerating(true);

		try {
			await Promise.all(
				entriesToGenerate.map(async (entry) => {
					// Set loading state for this entry
					setEntries((prev) =>
						prev.map((e) =>
							e.id === entry.id ? { ...e, isGeneratingTitle: true } : e
						)
					);

					try {
						const response = await fetch("/api/title", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								keyword: entry.keyword,
								language,
								targetCountry,
								contentType: entry.contentType,
								businessName: entry.includeBusinessName
									? selectedWebsite?.name
									: undefined,
							}),
						});

						if (!response.ok) {
							throw new Error("Failed to generate title");
						}

						const data = await response.json();
						if (data.title) {
							setEntries((prev) =>
								prev.map((e) =>
									e.id === entry.id
										? { ...e, title: data.title, isGeneratingTitle: false }
										: e
								)
							);
						}
					} catch (error) {
						console.error(
							`Error generating title for ${entry.keyword}:`,
							error
						);
						setEntries((prev) =>
							prev.map((e) =>
								e.id === entry.id ? { ...e, isGeneratingTitle: false } : e
							)
						);
					}
				})
			);

			toast.success("Bulk title generation completed!");
		} catch (error) {
			console.error("Error in bulk title generation:", error);
			toast.error("Some titles failed to generate");
		} finally {
			setIsBulkGenerating(false);
		}
	};

	return (
		<main className="h-screen flex flex-col p-4 md:p-8 bg-[#f8f9fa]">
			<Card className="flex-1 flex flex-col bg-white border shadow-sm overflow-hidden">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b shrink-0">
					<CardTitle className="text-2xl font-bold text-gray-900">
						Bulk Content Generation
					</CardTitle>
					{isLoading && (
						<div className="flex items-center gap-2 text-gray-500">
							<Loader2 className="h-4 w-4 animate-spin" />
							<span className="text-sm">Loading websites...</span>
						</div>
					)}
				</CardHeader>
				<CardContent className="pt-6 flex-1 overflow-auto">
					<form onSubmit={handleSubmit} className="space-y-8 h-full">
						{/* Global Settings */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label className="text-gray-700 font-bold">Language</Label>
								<Select value={language} onValueChange={setLanguage}>
									<SelectTrigger className="bg-white">
										<SelectValue placeholder="Select language" />
									</SelectTrigger>
									<SelectContent>
										{LANGUAGES.map((lang) => (
											<SelectItem key={lang.code} value={lang.code}>
												{lang.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label className="text-gray-700 font-bold">
									Target Country
								</Label>
								<Select value={targetCountry} onValueChange={setTargetCountry}>
									<SelectTrigger className="bg-white">
										<SelectValue placeholder="Select country" />
									</SelectTrigger>
									<SelectContent>
										{COUNTRIES.map((country) => (
											<SelectItem key={country.code} value={country.code}>
												{country.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Content Entries */}
						<div className="space-y-4">
							{entries.map((entry) => (
								<Card key={entry.id} className="border bg-gray-50">
									<CardContent className="pt-6">
										<div className="flex justify-between items-center mb-4">
											<Badge variant="secondary">Content #{entry.id}</Badge>
											<div className="flex gap-2">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => toggleExpand(entry.id)}>
													{entry.isExpanded ? (
														<ChevronUp className="h-4 w-4" />
													) : (
														<ChevronDown className="h-4 w-4" />
													)}
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => removeEntry(entry.id)}
													className="text-red-500 hover:text-red-700">
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>

										{entry.isExpanded && (
											<div className="space-y-4">
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div className="space-y-2">
														<Label className="text-gray-700 font-bold">
															Main Keyword
														</Label>
														<Input
															value={entry.keyword}
															onChange={(e) =>
																updateEntry(entry.id, "keyword", e.target.value)
															}
															placeholder="Enter your main keyword or topic..."
															className="bg-white"
															required
														/>
													</div>

													<div className="space-y-2">
														<Label className="text-gray-700 font-bold">
															Content Type
														</Label>
														<Select
															value={entry.contentType}
															onValueChange={(value) =>
																updateEntry(entry.id, "contentType", value)
															}>
															<SelectTrigger className="bg-white">
																<SelectValue placeholder="Select content type" />
															</SelectTrigger>
															<SelectContent>
																{CONTENT_TYPES.map((type) => (
																	<SelectItem
																		key={type.value}
																		value={type.value}>
																		{type.label}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
														{entry.contentType && (
															<p className="text-sm text-gray-500">
																{
																	CONTENT_TYPES.find(
																		(t) => t.value === entry.contentType
																	)?.description
																}
															</p>
														)}
													</div>
												</div>

												<div className="space-y-2">
													<Label className="text-gray-700 font-bold">
														Title
													</Label>
													<div className="flex items-center gap-2 mb-2">
														<div className="flex items-center space-x-2">
															<Checkbox
																id={`includeBusinessName-${entry.id}`}
																checked={entry.includeBusinessName}
																onCheckedChange={(checked: boolean) =>
																	setEntries((prev) =>
																		prev.map((e) =>
																			e.id === entry.id
																				? {
																						...e,
																						includeBusinessName: checked,
																				  }
																				: e
																		)
																	)
																}
															/>
															<label
																htmlFor={`includeBusinessName-${entry.id}`}
																className="text-sm text-gray-600">
																Include business name in title
															</label>
														</div>
													</div>
													<div className="flex gap-3">
														<Input
															value={entry.title}
															onChange={(e) =>
																updateEntry(entry.id, "title", e.target.value)
															}
															placeholder="Enter title or generate one..."
															className="bg-white"
															required
														/>
														<Button
															type="button"
															variant="secondary"
															onClick={() => handleGenerateTitle(entry.id)}
															disabled={
																!entry.keyword || entry.isGeneratingTitle
															}>
															{entry.isGeneratingTitle ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																"Generate"
															)}
														</Button>
													</div>
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							))}
						</div>

						<div className="sticky bottom-0 flex justify-between items-center pt-4 pb-2 bg-white border-t mt-auto">
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={addNewEntry}
									className="flex items-center gap-2">
									<Plus className="h-4 w-4" />
									Add Single
								</Button>

								<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
									<DialogTrigger asChild>
										<Button
											type="button"
											variant="outline"
											className="flex items-center gap-2">
											<ListPlus className="h-4 w-4" />
											Bulk Add Keywords
										</Button>
									</DialogTrigger>
									<DialogContent className="sm:max-w-[425px]">
										<DialogHeader>
											<DialogTitle>Add Multiple Keywords</DialogTitle>
											<DialogDescription>
												Paste your keywords below, one per line. Each keyword
												will create a new content entry.
											</DialogDescription>
										</DialogHeader>
										<div className="grid gap-4 py-4">
											<div className="space-y-2">
												<Label className="text-gray-700 font-bold">
													Content Type for All Entries
												</Label>
												<Select
													value={bulkContentType}
													onValueChange={setBulkContentType}>
													<SelectTrigger className="bg-white">
														<SelectValue placeholder="Select content type" />
													</SelectTrigger>
													<SelectContent>
														{CONTENT_TYPES.map((type) => (
															<SelectItem key={type.value} value={type.value}>
																{type.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												{bulkContentType && (
													<p className="text-sm text-gray-500">
														{
															CONTENT_TYPES.find(
																(t) => t.value === bulkContentType
															)?.description
														}
													</p>
												)}
											</div>

											<div className="space-y-2">
												<Label className="text-gray-700 font-bold">
													Keywords
												</Label>
												<Textarea
													value={bulkKeywords}
													onChange={(
														e: React.ChangeEvent<HTMLTextAreaElement>
													) => setBulkKeywords(e.target.value)}
													placeholder="Enter keywords, one per line..."
													className="min-h-[200px]"
												/>
											</div>

											<Button
												type="button"
												variant="secondary"
												onClick={handleBulkAdd}
												disabled={!bulkKeywords.trim()}>
												Add Keywords
											</Button>
										</div>
									</DialogContent>
								</Dialog>

								<Button
									type="button"
									variant="outline"
									onClick={handleBulkGenerateTitles}
									disabled={isBulkGenerating || entries.length === 0}
									className="flex items-center gap-2">
									{isBulkGenerating ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Generating...
										</>
									) : (
										<>
											<ListPlus className="h-4 w-4" />
											Generate All Titles
										</>
									)}
								</Button>
							</div>

							<Button
								type="submit"
								variant="secondary"
								disabled={entries.length === 0}>
								Continue
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
