"use client";

import { useState, useEffect } from "react";
import { LANGUAGES, COUNTRIES } from "@/lib/localization";
import { toast } from "react-hot-toast";
import CompanyForm from "@/components/CompanyForm";

export default function Home() {
	const [keyword, setKeyword] = useState("");
	const [title, setTitle] = useState("");
	const [relatedKeywords, setRelatedKeywords] = useState<string[]>([]);
	const [newKeyword, setNewKeyword] = useState("");
	const [outline, setOutline] = useState<string[]>([]);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [streamedContent, setStreamedContent] = useState("");
	const [currentSection, setCurrentSection] = useState("");
	const [wordCount, setWordCount] = useState(0);
	const [step, setStep] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
	const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
	const [sampleText, setSampleText] = useState("");
	const [tone, setTone] = useState({
		detailedAnalysis: "",
		tone: "",
		style: "",
		voice: "",
		language: "",
		engagement: "",
	});
	const [isAnalyzingTone, setIsAnalyzingTone] = useState(false);
	const [language, setLanguage] = useState("en-US");
	const [targetCountry, setTargetCountry] = useState("US");
	const [showCopied, setShowCopied] = useState(false);
	const [companyInfo, setCompanyInfo] = useState({
		name: "",
		website: "",
		description: "",
		summary: "",
	});
	const [contentType, setContentType] = useState("article");

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

	useEffect(() => {
		const words = streamedContent.trim().split(/\s+/).length;
		setWordCount(words);
	}, [streamedContent]);

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

	const handleAddKeyword = (e: React.FormEvent) => {
		e.preventDefault();
		if (newKeyword.trim()) {
			setRelatedKeywords((prev) => [...prev, newKeyword.trim()]);
			setNewKeyword("");
		}
	};

	const removeKeyword = (indexToRemove: number) => {
		setRelatedKeywords((prev) =>
			prev.filter((_, index) => index !== indexToRemove)
		);
	};

	const handleKeywordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setStep(2);
		handleOutlineGeneration();
	};

	const handleOutlineGeneration = async () => {
		setIsLoading(true);
		try {
			const response = await fetch("/api/outline", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					keyword,
					title,
					language,
					targetCountry,
					contentType,
				}),
			});
			const data = await response.json();
			if (data.outline) {
				console.log("Received outline:", data.outline);
				setOutline(data.outline);
			}
		} catch (error) {
			console.error("Error:", error);
		}
		setIsLoading(false);
	};

	const handleGenerateTitle = async () => {
		if (!keyword) return;
		setIsGeneratingTitle(true);
		try {
			const response = await fetch("/api/title", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ keyword, language, targetCountry, contentType }),
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

	const handleContentGeneration = async () => {
		setStep(3);
		setIsLoading(true);
		setStreamedContent("");
		setWordCount(0);
		setCurrentSection("");

		try {
			const response = await fetch("/api/content", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					keyword,
					title,
					outline,
					relatedKeywords,
					tone,
					language,
					targetCountry,
					companyInfo,
					contentType,
				}),
			});

			if (!response.ok) throw new Error("Network response was not ok");
			const reader = response.body?.getReader();
			if (!reader) throw new Error("No reader available");

			setStep(4);

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const text = new TextDecoder().decode(value);
				const lines = text.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(5);
						if (data === "[DONE]") break;

						try {
							const parsed = JSON.parse(data);
							if (parsed.content) {
								setStreamedContent((prev) => {
									const newContent = prev + parsed.content;
									// Count words in the new content
									const words = newContent
										.replace(/<[^>]*>/g, "")
										.trim()
										.split(/\s+/).length;
									setWordCount(words);
									return newContent;
								});
							}
							if (parsed.section) {
								setCurrentSection(parsed.section);
							}
						} catch (e) {
							console.error("Error parsing JSON:", e);
						}
					}
				}
			}
		} catch (error) {
			console.error("Error:", error);
		}
		setIsLoading(false);
	};

	const handleToneAnalysis = async () => {
		if (!sampleText.trim()) return;
		setIsAnalyzingTone(true);
		try {
			const response = await fetch("/api/tone", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sampleText }),
			});
			const data = await response.json();
			if (data) {
				setTone(data);
			}
		} catch (error) {
			console.error("Error:", error);
		}
		setIsAnalyzingTone(false);
	};

	const handleCopyContent = async () => {
		try {
			await navigator.clipboard.writeText(streamedContent);
			setShowCopied(true);
			toast.success("Content copied to clipboard!");
			setTimeout(() => setShowCopied(false), 2000);
		} catch (err) {
			toast.error("Failed to copy content");
		}
	};

	const handleExportHTML = () => {
		const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || "Generated Content"}</title>
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
    ${streamedContent}
</body>
</html>`;

		const blob = new Blob([htmlContent], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${title || "generated-content"}.html`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		toast.success("Content exported as HTML!");
	};

	const handleCompanyFormComplete = (info: {
		name: string;
		website: string;
		description: string;
		summary: string;
	}) => {
		setCompanyInfo(info);
		console.log("INFO:", info);
		setStep(1);
	};

	return (
		<main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
					AI Content Generator
				</h1>

				<div className="flex items-center gap-4">
					<span className="text-sm text-gray-600">Welcome</span>
					<a href="/api/auth/logout" className="btn-secondary text-sm">
						Logout
					</a>
				</div>
			</div>

			{isLoading && step !== 4 && (
				<div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
					<div className="card p-6 flex items-center gap-3">
						<div className="w-6 h-6 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
						<span className="text-lg">Generating...</span>
					</div>
				</div>
			)}

			{step === 0 && (
				<div className="card p-6">
					<CompanyForm onComplete={handleCompanyFormComplete} />
				</div>
			)}

			{step === 1 && (
				<div className="card p-6 space-y-6">
					<div className="flex justify-between items-center">
						<h2 className="text-2xl font-semibold">Content Details</h2>
						<button
							onClick={() => setStep(0)}
							className="btn-secondary text-sm">
							← Back to Company Info
						</button>
					</div>
					<form onSubmit={handleKeywordSubmit} className="space-y-6">
						<div>
							<label className="block text-sm font-medium mb-2 text-[var(--secondary)]">
								Main Keyword
							</label>
							<input
								type="text"
								value={keyword}
								onChange={(e) => setKeyword(e.target.value)}
								className="input-field"
								placeholder="Enter your main keyword or topic..."
								required
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium mb-2 text-[var(--secondary)]">
									Language
								</label>
								<select
									value={language}
									onChange={(e) => setLanguage(e.target.value)}
									className="input-field"
									required>
									{LANGUAGES.map((lang) => (
										<option key={lang.code} value={lang.code}>
											{lang.name}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2 text-[var(--secondary)]">
									Target Country
								</label>
								<select
									value={targetCountry}
									onChange={(e) => setTargetCountry(e.target.value)}
									className="input-field"
									required>
									{COUNTRIES.map((country) => (
										<option key={country.code} value={country.code}>
											{country.name}
										</option>
									))}
								</select>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-2 text-[var(--secondary)]">
								Content Type
							</label>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{CONTENT_TYPES.map((type) => (
									<div
										key={type.value}
										className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
											contentType === type.value
												? "border-[var(--primary)] bg-[var(--primary)]/5"
												: "border-gray-200 dark:border-gray-700 hover:border-[var(--primary)]/50"
										}`}
										onClick={() => setContentType(type.value)}>
										<div className="flex items-center gap-2 mb-1">
											<input
												type="radio"
												name="contentType"
												value={type.value}
												checked={contentType === type.value}
												onChange={(e) => setContentType(e.target.value)}
												className="text-[var(--primary)]"
											/>
											<span className="font-medium">{type.label}</span>
										</div>
										<p className="text-sm text-[var(--secondary)]">
											{type.description}
										</p>
									</div>
								))}
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-2 text-[var(--secondary)]">
								Title{" "}
								{title && (
									<span className="text-[var(--primary)]">(AI Generated)</span>
								)}
							</label>
							<div className="flex gap-3">
								<input
									type="text"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									className="input-field flex-grow"
									placeholder="Enter title or generate one..."
									required
								/>
								<button
									type="button"
									onClick={handleGenerateTitle}
									disabled={!keyword || isGeneratingTitle}
									className="btn-secondary whitespace-nowrap">
									{isGeneratingTitle ? (
										<div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
									) : (
										"Generate"
									)}
								</button>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-2 text-[var(--secondary)]">
								Sample Text for Tone Analysis (Optional)
							</label>
							<div className="space-y-3">
								<textarea
									value={sampleText}
									onChange={(e) => setSampleText(e.target.value)}
									className="input-field min-h-[100px]"
									placeholder="Paste a sample of your content to analyze its tone and style..."
								/>
								<div className="flex flex-col gap-4">
									<button
										type="button"
										onClick={handleToneAnalysis}
										disabled={!sampleText.trim() || isAnalyzingTone}
										className="btn-primary self-start">
										{isAnalyzingTone ? (
											<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
										) : (
											"Analyze Writing Style"
										)}
									</button>
									{tone.tone && (
										<div className="text-sm space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div>
													<h3 className="font-semibold mb-1">Overall Tone</h3>
													<p className="text-[var(--secondary)] whitespace-pre-wrap">
														{tone.tone}
													</p>
												</div>
												<div>
													<h3 className="font-semibold mb-1">Writing Style</h3>
													<p className="text-[var(--secondary)] whitespace-pre-wrap">
														{tone.style}
													</p>
												</div>
												<div>
													<h3 className="font-semibold mb-1">
														Voice Characteristics
													</h3>
													<p className="text-[var(--secondary)] whitespace-pre-wrap">
														{tone.voice}
													</p>
												</div>
												<div>
													<h3 className="font-semibold mb-1">
														Language Patterns
													</h3>
													<p className="text-[var(--secondary)] whitespace-pre-wrap">
														{tone.language}
													</p>
												</div>
												<div className="md:col-span-2">
													<h3 className="font-semibold mb-1">
														Engagement Elements
													</h3>
													<p className="text-[var(--secondary)] whitespace-pre-wrap">
														{tone.engagement}
													</p>
												</div>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-2 text-[var(--secondary)]">
								Related Keywords (Optional)
							</label>
							<div className="flex gap-2 mb-3">
								<button
									type="button"
									onClick={handleGenerateKeywords}
									disabled={!keyword || isGeneratingKeywords}
									className="btn-primary whitespace-nowrap">
									{isGeneratingKeywords ? (
										<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
									) : (
										"Generate Keywords"
									)}
								</button>
							</div>

							<div className="flex flex-wrap gap-2 mb-3">
								{relatedKeywords.map((kw, index) => (
									<span key={index} className="tag group">
										{kw}
										<button
											type="button"
											onClick={() => removeKeyword(index)}
											className="ml-2 text-[var(--secondary)] hover:text-red-500 transition-colors">
											×
										</button>
									</span>
								))}
							</div>

							<div className="flex gap-2">
								<input
									type="text"
									value={newKeyword}
									onChange={(e) => setNewKeyword(e.target.value)}
									className="input-field"
									placeholder="Add a custom keyword"
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
								<button
									type="button"
									onClick={() => {
										if (newKeyword.trim()) {
											setRelatedKeywords((prev) => [
												...prev,
												newKeyword.trim(),
											]);
											setNewKeyword("");
										}
									}}
									className="btn-primary whitespace-nowrap"
									disabled={!newKeyword.trim()}>
									Add
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={!keyword || !title}
							className="btn-primary w-full">
							Continue
						</button>
					</form>
				</div>
			)}

			{step === 2 && (
				<div className="card p-6 space-y-6">
					<div className="flex justify-between items-center">
						<h2 className="text-2xl font-semibold">Article Outline</h2>
						<button
							onClick={() => setStep(1)}
							className="btn-secondary text-sm">
							← Back
						</button>
					</div>

					{outline.length > 0 ? (
						<>
							<div className="space-y-3">
								{outline.map((item, index) => (
									<div
										key={index}
										className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg group">
										<div className="flex items-center gap-2">
											{index > 0 && (
												<button
													onClick={() => {
														const newOutline = [...outline];
														[newOutline[index], newOutline[index - 1]] = [
															newOutline[index - 1],
															newOutline[index],
														];
														setOutline(newOutline);
													}}
													className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--secondary)] hover:text-[var(--primary)]"
													title="Move up">
													↑
												</button>
											)}
											{index < outline.length - 1 && (
												<button
													onClick={() => {
														const newOutline = [...outline];
														[newOutline[index], newOutline[index + 1]] = [
															newOutline[index + 1],
															newOutline[index],
														];
														setOutline(newOutline);
													}}
													className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--secondary)] hover:text-[var(--primary)]"
													title="Move down">
													↓
												</button>
											)}
										</div>
										<span className="font-mono text-[var(--primary)] font-semibold min-w-[1.5rem]">
											{index + 1}.
										</span>
										{editingIndex === index ? (
											<div className="flex-1 flex gap-2">
												<input
													type="text"
													value={item}
													onChange={(e) => {
														const newOutline = [...outline];
														newOutline[index] = e.target.value;
														setOutline(newOutline);
													}}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															setEditingIndex(null);
														} else if (e.key === "Escape") {
															setEditingIndex(null);
														}
													}}
													className="input-field flex-1"
													autoFocus
												/>
												<button
													onClick={() => setEditingIndex(null)}
													className="btn-secondary text-sm">
													Done
												</button>
											</div>
										) : (
											<div className="flex-1 flex justify-between items-start">
												<span className="flex-1">{item}</span>
												<div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
													<button
														onClick={() => setEditingIndex(index)}
														className="text-[var(--secondary)] hover:text-[var(--primary)]"
														title="Edit">
														✎
													</button>
													<button
														onClick={() => {
															const newOutline = outline.filter(
																(_, i) => i !== index
															);
															setOutline(newOutline);
														}}
														className="text-[var(--secondary)] hover:text-red-500"
														title="Delete">
														×
													</button>
												</div>
											</div>
										)}
									</div>
								))}
							</div>
							<div className="flex gap-2">
								<button
									onClick={() => {
										setOutline([...outline, "New section"]);
										setEditingIndex(outline.length);
									}}
									className="btn-secondary">
									Add Section
								</button>
								<button
									onClick={handleContentGeneration}
									className="btn-primary flex-1">
									Generate Content
								</button>
							</div>
						</>
					) : (
						<div className="text-center py-8">
							<div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
							<p className="text-[var(--secondary)]">Generating outline...</p>
						</div>
					)}
				</div>
			)}

			{step === 3 && (
				<div className="space-y-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-2xl font-semibold">Generated Content</h2>
						<div className="flex items-center gap-3">
							<div className="text-sm text-[var(--secondary)]">
								{wordCount} words written
							</div>
							{streamedContent && (
								<div className="flex gap-2">
									<button
										onClick={handleCopyContent}
										className="btn-secondary text-sm flex items-center gap-1"
										title="Copy to clipboard">
										{showCopied ? (
											<>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24">
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M5 13l4 4L19 7"
													/>
												</svg>
												Copied!
											</>
										) : (
											<>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24">
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
													/>
												</svg>
												Copy
											</>
										)}
									</button>
									<button
										onClick={handleExportHTML}
										className="btn-secondary text-sm flex items-center gap-1"
										title="Export as HTML">
										<svg
											className="w-4 h-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
											/>
										</svg>
										Export
									</button>
								</div>
							)}
						</div>
					</div>

					<div className="card p-6 md:p-8">
						{isLoading ? (
							<div className="space-y-4">
								<div className="text-center py-4">
									<div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
									<p className="text-[var(--secondary)] mb-2">
										{currentSection
											? `Generating ${currentSection}...`
											: "Preparing content..."}
									</p>
									{wordCount > 0 && (
										<p className="text-sm text-[var(--secondary)]">
											{wordCount} words generated
										</p>
									)}
								</div>
								{streamedContent && (
									<div className="prose prose-lg dark:prose-invert max-w-none">
										<div
											dangerouslySetInnerHTML={{ __html: streamedContent }}
										/>
									</div>
								)}
							</div>
						) : streamedContent ? (
							<div className="prose prose-lg dark:prose-invert max-w-none">
								<div dangerouslySetInnerHTML={{ __html: streamedContent }} />
							</div>
						) : (
							<div className="text-center py-8 text-[var(--secondary)]">
								No content generated yet. Please wait...
							</div>
						)}
					</div>
				</div>
			)}

			{step === 4 && (
				<div className="card p-6 space-y-6">
					<div className="flex justify-between items-center mb-4">
						<div>
							<h2 className="text-2xl font-semibold">Generated Content</h2>
							{wordCount > 0 && (
								<p className="text-sm text-[var(--secondary)]">
									Word count: {wordCount}
								</p>
							)}
						</div>
						<div className="flex items-center gap-3">
							{streamedContent && (
								<div className="flex gap-2">
									<button
										onClick={handleCopyContent}
										className="btn-secondary text-sm flex items-center gap-1"
										title="Copy to clipboard">
										{showCopied ? (
											<>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24">
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M5 13l4 4L19 7"
													/>
												</svg>
												Copied!
											</>
										) : (
											<>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24">
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
													/>
												</svg>
												Copy
											</>
										)}
									</button>
									<button
										onClick={handleExportHTML}
										className="btn-secondary text-sm flex items-center gap-1"
										title="Export as HTML">
										<svg
											className="w-4 h-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
											/>
										</svg>
										Export
									</button>
								</div>
							)}
							<button
								onClick={() => setStep(3)}
								className="btn-secondary text-sm">
								← Back
							</button>
						</div>
					</div>

					{isLoading ? (
						<div className="space-y-4">
							<div className="text-center py-4">
								<div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
								<p className="text-[var(--secondary)] mb-2">
									{currentSection
										? `Generating ${currentSection}...`
										: "Preparing content..."}
								</p>
								{wordCount > 0 && (
									<p className="text-sm text-[var(--secondary)]">
										{wordCount} words generated
									</p>
								)}
							</div>
							{streamedContent && (
								<div className="prose prose-lg dark:prose-invert max-w-none">
									<div dangerouslySetInnerHTML={{ __html: streamedContent }} />
								</div>
							)}
						</div>
					) : streamedContent ? (
						<div className="prose prose-lg dark:prose-invert max-w-none">
							<div dangerouslySetInnerHTML={{ __html: streamedContent }} />
						</div>
					) : (
						<div className="text-center py-8 text-[var(--secondary)]">
							No content generated yet. Please wait...
						</div>
					)}
				</div>
			)}
		</main>
	);
}
