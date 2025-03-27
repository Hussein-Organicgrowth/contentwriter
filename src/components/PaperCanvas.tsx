"use client";

import { useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Loader2,
	Wand2,
	Settings,
	Bold,
	Italic,
	Underline,
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	AlignLeft,
	AlignCenter,
	AlignRight,
	Type,
	Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import AiSuggestions from "./AiSuggestions";

interface PaperCanvasProps {
	initialContent?: string;
	onContentChange?: (content: string) => void;
}

interface Analysis {
	headlines: Array<{
		original?: string;
		suggestion: string;
		reason: string;
	}>;
	sections: Array<{
		title: string;
		description: string;
		reason: string;
	}>;
	improvements: Array<{
		type: string;
		suggestion: string;
		reason: string;
	}>;
}

export default function PaperCanvas({
	initialContent = "",
	onContentChange,
}: PaperCanvasProps) {
	const [content, setContent] = useState(initialContent);
	const [mainKeyword, setMainKeyword] = useState("");
	const [url, setUrl] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [paperWidth, setPaperWidth] = useState(1200);
	const [showKeywordDialog, setShowKeywordDialog] = useState(true);
	const [analysis, setAnalysis] = useState<Analysis | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
				},
			}),
		],
		content,
		onUpdate: ({ editor }) => {
			const newContent = editor.getHTML();
			setContent(newContent);
			onContentChange?.(newContent);
		},
		editorProps: {
			attributes: {
				class: "prose prose-lg max-w-none focus:outline-none",
			},
		},
	});

	const analyzeContent = async () => {
		if (!content || !mainKeyword) {
			toast.error("Please enter content and a main keyword");
			return;
		}

		setIsLoading(true);
		try {
			const response = await fetch("/api/content/analyze", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ content, mainKeyword }),
			});

			if (!response.ok) {
				throw new Error("Failed to analyze content");
			}

			const data = await response.json();
			setAnalysis(data);
			toast.success("Content analyzed successfully");
		} catch (error) {
			console.error("Error analyzing content:", error);
			toast.error("Failed to analyze content. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const crawlWebsite = async () => {
		if (!url) {
			toast.error("Please enter a URL to crawl");
			return;
		}

		setIsLoading(true);
		try {
			const response = await fetch("/api/content/crawl", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ url, mainKeyword }),
			});

			if (!response.ok) {
				throw new Error("Failed to crawl website");
			}

			const data = await response.json();
			editor?.commands.setContent(data.content || "");
			toast.success("Content crawled successfully");
		} catch (error) {
			console.error("Error crawling website:", error);
			toast.error("Failed to crawl website. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const rewriteContent = async () => {
		if (!content || !mainKeyword) return;

		setIsLoading(true);
		try {
			const response = await fetch("/api/content/rewrite", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ content, mainKeyword }),
			});

			if (!response.ok) {
				throw new Error("Failed to rewrite content");
			}

			const data = await response.json();
			editor?.commands.setContent(data.rewrittenContent || content);
			toast.success("Content rewritten successfully");
		} catch (error) {
			console.error("Error rewriting content:", error);
			toast.error("Failed to rewrite content. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeywordSubmit = () => {
		if (!mainKeyword.trim()) {
			toast.error("Please enter a main keyword");
			return;
		}
		setShowKeywordDialog(false);
	};

	return (
		<div className="min-h-screen bg-gray-100 p-4">
			<Dialog open={showKeywordDialog} onOpenChange={setShowKeywordDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Welcome to Paper Canvas</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Main Keyword
						</label>
						<Input
							value={mainKeyword}
							onChange={(e) => setMainKeyword(e.target.value)}
							placeholder="Enter main keyword for content optimization"
							className="w-full"
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button onClick={handleKeywordSubmit} variant="secondary">
							Start Writing
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className="max-w-[1400px] mx-auto">
				<div className="flex justify-between items-center mb-4">
					<h1 className="text-2xl font-bold text-gray-900">Paper Canvas</h1>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShowSettings(!showSettings)}
							className="flex items-center gap-2">
							<Settings className="w-4 h-4" />
							Settings
						</Button>
						<Button
							variant="secondary"
							size="sm"
							onClick={rewriteContent}
							disabled={isLoading || !mainKeyword}
							className="flex items-center gap-2">
							{isLoading ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<Wand2 className="w-4 h-4" />
							)}
							Rewrite
						</Button>
					</div>
				</div>

				{showSettings && (
					<Card className="p-4 mb-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Main Keyword
								</label>
								<Input
									value={mainKeyword}
									onChange={(e) => setMainKeyword(e.target.value)}
									placeholder="Enter main keyword"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Website URL (Optional)
								</label>
								<div className="flex gap-2">
									<Input
										type="url"
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										placeholder="Enter URL to crawl content"
									/>
									<Button
										variant="outline"
										size="sm"
										onClick={crawlWebsite}
										disabled={isLoading || !url}
										className="flex items-center gap-2">
										{isLoading ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<Globe className="w-4 h-4" />
										)}
										Crawl
									</Button>
								</div>
							</div>
						</div>
					</Card>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-4">
					<div
						ref={containerRef}
						className="relative mx-auto"
						style={{ width: paperWidth }}>
						<div className="bg-white shadow-lg rounded-lg overflow-hidden">
							{/* Toolbar */}
							<div className="border-b border-gray-200 p-2 flex flex-wrap gap-2 items-center sticky top-0 bg-white z-10">
								<div className="flex items-center gap-1 border-r pr-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => editor?.chain().focus().toggleBold().run()}
										className={cn(
											"h-8 w-8 p-0",
											editor?.isActive("bold") && "bg-gray-100"
										)}>
										<Bold className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => editor?.chain().focus().toggleItalic().run()}
										className={cn(
											"h-8 w-8 p-0",
											editor?.isActive("italic") && "bg-gray-100"
										)}>
										<Italic className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											editor?.chain().focus().toggleUnderline().run()
										}
										className={cn(
											"h-8 w-8 p-0",
											editor?.isActive("underline") && "bg-gray-100"
										)}>
										<Underline className="h-4 w-4" />
									</Button>
								</div>

								<div className="flex items-center gap-1 border-r pr-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											editor?.chain().focus().toggleHeading({ level: 1 }).run()
										}
										className={cn(
											"h-8 w-8 p-0",
											editor?.isActive("heading", { level: 1 }) && "bg-gray-100"
										)}>
										<Heading1 className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											editor?.chain().focus().toggleHeading({ level: 2 }).run()
										}
										className={cn(
											"h-8 w-8 p-0",
											editor?.isActive("heading", { level: 2 }) && "bg-gray-100"
										)}>
										<Heading2 className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											editor?.chain().focus().toggleHeading({ level: 3 }).run()
										}
										className={cn(
											"h-8 w-8 p-0",
											editor?.isActive("heading", { level: 3 }) && "bg-gray-100"
										)}>
										<Heading3 className="h-4 w-4" />
									</Button>
								</div>

								<div className="flex items-center gap-1 border-r pr-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											editor?.chain().focus().toggleBulletList().run()
										}
										className={cn(
											"h-8 w-8 p-0",
											editor?.isActive("bulletList") && "bg-gray-100"
										)}>
										<List className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											editor?.chain().focus().toggleOrderedList().run()
										}
										className={cn(
											"h-8 w-8 p-0",
											editor?.isActive("orderedList") && "bg-gray-100"
										)}>
										<ListOrdered className="h-4 w-4" />
									</Button>
								</div>

								<div className="flex items-center gap-1">
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											editor?.chain().focus().setTextAlign("left").run()
										}
										className={cn(
											"h-8 w-8 p-0",
											editor?.isActive({ textAlign: "left" }) && "bg-gray-100"
										)}>
										<AlignLeft className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											editor?.chain().focus().setTextAlign("center").run()
										}
										className={cn(
											"h-8 w-8 p-0",
											editor?.isActive({ textAlign: "center" }) && "bg-gray-100"
										)}>
										<AlignCenter className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											editor?.chain().focus().setTextAlign("right").run()
										}
										className={cn(
											"h-8 w-8 p-0",
											editor?.isActive({ textAlign: "right" }) && "bg-gray-100"
										)}>
										<AlignRight className="h-4 w-4" />
									</Button>
								</div>
							</div>

							{/* Editor Content */}
							<ScrollArea className="h-[calc(100vh-200px)]">
								<div className="p-12">
									<EditorContent
										editor={editor}
										className={cn(
											"prose prose-lg max-w-none focus:outline-none",
											"prose-headings:font-bold prose-headings:text-gray-900",
											"prose-p:text-gray-700 prose-p:leading-relaxed"
										)}
									/>
								</div>
							</ScrollArea>
						</div>
					</div>

					{/* AI Suggestions Panel */}
					<div className="lg:sticky lg:top-4">
						<AiSuggestions
							editor={editor}
							isLoading={isLoading}
							onAnalyze={analyzeContent}
							analysis={analysis}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
