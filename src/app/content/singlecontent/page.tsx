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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { IWebsite as Website } from "@/models/Website";

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

export default function SingleContent() {
	const router = useRouter();
	const [keyword, setKeyword] = useState("");
	const [title, setTitle] = useState("");
	const [relatedKeywords, setRelatedKeywords] = useState<string[]>([]);
	const [newKeyword, setNewKeyword] = useState("");
	const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
	const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
	const [language, setLanguage] = useState("da");
	const [targetCountry, setTargetCountry] = useState("DK");
	const [contentType, setContentType] = useState("article");
	const [website, setWebsite] = useState<Website[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
	const [includeBusinessName, setIncludeBusinessName] = useState(false);

	useEffect(() => {
		const fetchWebsites = async () => {
			setIsLoading(true);
			try {
				const response = await fetch("/api/website");
				const data = await response.json();
				if (data.websites) {
					setWebsite(data.websites);
					console.log("data.websites", data.websites);

					// Retrieve the company name from localStorage
					const companyName = localStorage.getItem("company");
					if (companyName) {
						// Find the website that matches the company name
						const matchedWebsite = data.websites.find(
							(w: Website) => w.name.toLowerCase() === companyName.toLowerCase()
						);

						if (matchedWebsite) {
							setSelectedWebsite(matchedWebsite);
							console.log("matchedWebsite", matchedWebsite);
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

	const handleGenerateTitle = async () => {
		if (!keyword) return;
		setIsGeneratingTitle(true);
		try {
			const response = await fetch("/api/title", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					keyword,
					language,
					targetCountry,
					contentType,
					businessName: includeBusinessName ? selectedWebsite?.name : undefined,
				}),
			});
			const data = await response.json();
			if (data.title) {
				setTitle(data.title);
			}
		} catch (error) {
			console.error("Error:", error);
		}
		setIsGeneratingTitle(false);
	};

	const handleGenerateKeywords = async () => {
		if (!keyword) return;
		setIsGeneratingKeywords(true);
		try {
			const response = await fetch("/api/keywords", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ keyword, title }),
			});
			const data = await response.json();
			if (data.keywords) {
				setRelatedKeywords(data.keywords);
			}
		} catch (error) {
			console.error("Error:", error);
		}
		setIsGeneratingKeywords(false);
	};

	const removeKeyword = (indexToRemove: number) => {
		setRelatedKeywords((prev) =>
			prev.filter((_, index) => index !== indexToRemove)
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const formData = {
			keyword,
			title,
			language,
			targetCountry,
			contentType,
			relatedKeywords,
			selectedWebsite,
		};

		// Store the form data in localStorage for the outline page
		localStorage.setItem("contentFormData", JSON.stringify(formData));

		// Navigate to the outline page
		router.push("/content/singlecontent/outline");
	};

	return (
		<main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto bg-[#f8f9fa]">
			<Card className="bg-white border shadow-sm">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
					<CardTitle className="text-2xl font-bold text-gray-900">
						Content Details
					</CardTitle>
					{isLoading && (
						<div className="flex items-center gap-2 text-gray-500">
							<Loader2 className="h-4 w-4 animate-spin" />
							<span className="text-sm">Loading websites...</span>
						</div>
					)}
				</CardHeader>
				<CardContent className="pt-6">
					<form onSubmit={handleSubmit} className="space-y-8">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Main Keyword */}
							<div className="space-y-2">
								<Label className="text-gray-700 font-bold">Main Keyword</Label>
								<Input
									value={keyword}
									onChange={(e) => setKeyword(e.target.value)}
									placeholder="Enter your main keyword or topic..."
									className="bg-white"
									required
								/>
							</div>

							{/* Content Type */}
							<div className="space-y-2">
								<Label className="text-gray-700 font-bold">Content Type</Label>
								<Select value={contentType} onValueChange={setContentType}>
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
								{contentType && (
									<p className="text-sm text-gray-500">
										{
											CONTENT_TYPES.find((t) => t.value === contentType)
												?.description
										}
									</p>
								)}
							</div>
						</div>

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

						{/* Title Section */}
						<Card className="border bg-gray-50">
							<CardContent className="space-y-4 pt-6">
								<div className="space-y-2">
									<Label className="text-gray-700 font-bold">
										Title{" "}
										{title && (
											<span className="text-blue-600">(AI Generated)</span>
										)}
									</Label>
									<div className="flex items-center gap-2">
										<div className="flex items-center space-x-2">
											<Checkbox
												id="includeBusinessName"
												checked={includeBusinessName}
												onCheckedChange={(checked) =>
													setIncludeBusinessName(checked as boolean)
												}
											/>
											<label
												htmlFor="includeBusinessName"
												className="text-sm text-gray-600">
												Include business name in title
											</label>
										</div>
									</div>
									<div className="flex gap-3">
										<Input
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											placeholder="Enter title or generate one..."
											className="bg-white"
											required
										/>
										<Button
											type="button"
											variant="secondary"
											onClick={handleGenerateTitle}
											disabled={
												!keyword ||
												isGeneratingTitle ||
												(includeBusinessName && !selectedWebsite)
											}>
											{isGeneratingTitle ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												"Generate"
											)}
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Related Keywords Section */}
						<Card className="border bg-gray-50">
							<CardContent className="space-y-4 pt-6">
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<Label className="text-gray-700 font-bold">
											Related Keywords (Optional)
										</Label>
										{relatedKeywords.length > 0 && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setRelatedKeywords([])}
												className="text-red-500 hover:text-red-700">
												Clear All
											</Button>
										)}
									</div>
									<div className="flex gap-2">
										<Button
											type="button"
											variant="secondary"
											onClick={handleGenerateKeywords}
											disabled={!keyword || isGeneratingKeywords}>
											{isGeneratingKeywords ? (
												<Loader2 className="h-4 w-4 animate-spin mr-2" />
											) : null}
											Generate Keywords
										</Button>
									</div>

									<div className="flex flex-wrap gap-2">
										{relatedKeywords.map((kw, index) => (
											<Badge
												key={index}
												variant="secondary"
												className="flex items-center gap-1">
												{kw}
												<Button
													type="button"
													variant="ghost"
													size="sm"
													className="h-4 w-4 p-0 hover:text-red-500"
													onClick={() => removeKeyword(index)}>
													×
												</Button>
											</Badge>
										))}
									</div>

									<div className="flex gap-2">
										<Input
											value={newKeyword}
											onChange={(e) => setNewKeyword(e.target.value)}
											placeholder="Add a custom keyword"
											className="bg-white"
											onKeyPress={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													if (newKeyword.trim()) {
														setRelatedKeywords((prev) => [
															...prev,
															newKeyword.trim(),
														]);
														setNewKeyword("");
													}
												}
											}}
										/>
										<Button
											type="button"
											variant="secondary"
											onClick={() => {
												if (newKeyword.trim()) {
													setRelatedKeywords((prev) => [
														...prev,
														newKeyword.trim(),
													]);
													setNewKeyword("");
												}
											}}
											disabled={!newKeyword.trim()}>
											Add
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>

						<Button
							type="submit"
							variant="secondary"
							className="w-full"
							size="lg"
							disabled={!keyword || !title}>
							Generate Content
						</Button>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
