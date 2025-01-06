"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import {
	Loader2,
	ArrowLeft,
	Plus,
	X,
	MoveUp,
	MoveDown,
	Edit2,
} from "lucide-react";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";

interface OutlineItem {
	content: string;
	level: "h2" | "h3" | "h4";
}

interface FormData {
	keyword: string;
	title: string;
	language: string;
	targetCountry: string;
	contentType: string;
	relatedKeywords: string[];
	selectedWebsite: any;
}

export default function OutlinePage() {
	const router = useRouter();
	const [formData, setFormData] = useState<FormData | null>(null);
	const [outline, setOutline] = useState<OutlineItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [editingText, setEditingText] = useState("");
	const [editingLevel, setEditingLevel] = useState<"h2" | "h3" | "h4">("h2");

	const generateOutline = useCallback(async (data: FormData) => {
		setIsLoading(true);
		try {
			const response = await fetch("/api/outline", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					keyword: data.keyword,
					title: data.title,
					language: data.language,
					targetCountry: data.targetCountry,
					contentType: data.contentType,
				}),
			});
			const result = await response.json();
			if (result.outline) {
				const formattedOutline = result.outline
					.filter((line: string) => line.trim() !== "")
					.map((line: string) => {
						const content = line.replace(/^(H[234]:\s*)/, "").trim();
						let level: "h2" | "h3" | "h4" = "h2";

						if (line.startsWith("H3:")) level = "h3";
						else if (line.startsWith("H4:")) level = "h4";

						return { content, level };
					})
					.filter((item: OutlineItem) => item.content !== "");

				setOutline(formattedOutline);
			}
		} catch (error) {
			console.error("Error generating outline:", error);
			toast.error("Failed to generate outline");
		}
		setIsLoading(false);
	}, []);

	useEffect(() => {
		const initializeData = async () => {
			const storedData = localStorage.getItem("contentFormData");
			if (!storedData) {
				router.push("/content/singlecontent");
				return;
			}

			try {
				const parsedData = JSON.parse(storedData);
				setFormData(parsedData);
				await generateOutline(parsedData);
			} catch (error) {
				console.error("Error parsing stored data:", error);
				router.push("/content/singlecontent");
			}
		};

		initializeData();
	}, [router, generateOutline]);

	const handleMoveUp = (index: number) => {
		if (index > 0) {
			const newOutline = [...outline];
			[newOutline[index], newOutline[index - 1]] = [
				newOutline[index - 1],
				newOutline[index],
			];
			setOutline(newOutline);
		}
	};

	const handleMoveDown = (index: number) => {
		if (index < outline.length - 1) {
			const newOutline = [...outline];
			[newOutline[index], newOutline[index + 1]] = [
				newOutline[index + 1],
				newOutline[index],
			];
			setOutline(newOutline);
		}
	};

	const handleEdit = (index: number) => {
		setEditingIndex(index);
		setEditingText(outline[index].content);
		setEditingLevel(outline[index].level);
	};

	const handleSaveEdit = () => {
		if (editingIndex !== null) {
			const newOutline = [...outline];
			newOutline[editingIndex] = {
				content: editingText,
				level: editingLevel,
			};
			setOutline(newOutline);
			setEditingIndex(null);
			setEditingText("");
		}
	};

	const handleDelete = (index: number) => {
		const newOutline = outline.filter((_, i) => i !== index);
		setOutline(newOutline);
	};

	const handleAddSection = () => {
		setOutline([...outline, { content: "New Section", level: "h2" }]);
		handleEdit(outline.length);
	};

	const handleBack = () => {
		router.push("/content/singlecontent");
	};

	const handleContinue = () => {
		// Store the outline in localStorage
		localStorage.setItem("contentOutline", JSON.stringify(outline));
		// Navigate to content generation page
		router.push("/content/singlecontent/generate");
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
							Content Outline
						</CardTitle>
					</div>
					{formData && (
						<div className="text-sm text-gray-500">{formData.title}</div>
					)}
				</CardHeader>
				<CardContent className="pt-6">
					{isLoading ? (
						<div className="flex flex-col items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-4" />
							<p className="text-gray-500">Generating outline...</p>
						</div>
					) : (
						<div className="space-y-6">
							<div className="space-y-4">
								{outline.map((item, index) => (
									<div
										key={index}
										className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group">
										<span
											className={`font-mono text-blue-600 font-semibold min-w-[2.5rem] ${
												item.level === "h3"
													? "ml-4"
													: item.level === "h4"
													? "ml-8"
													: ""
											}`}>
											{item.level.toUpperCase()}
										</span>
										{editingIndex === index ? (
											<div className="flex-1 flex gap-2">
												<Select
													value={editingLevel}
													onValueChange={(value: "h2" | "h3" | "h4") =>
														setEditingLevel(value)
													}>
													<SelectTrigger className="w-24">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="h2">H2</SelectItem>
														<SelectItem value="h3">H3</SelectItem>
														<SelectItem value="h4">H4</SelectItem>
													</SelectContent>
												</Select>
												<Input
													value={editingText}
													onChange={(e) => setEditingText(e.target.value)}
													className="flex-1"
													autoFocus
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															handleSaveEdit();
														}
													}}
												/>
												<Button
													variant="secondary"
													size="sm"
													onClick={handleSaveEdit}>
													Save
												</Button>
											</div>
										) : (
											<div className="flex-1 flex justify-between items-start">
												<span
													className={`flex-1 ${
														item.level === "h2"
															? "font-semibold text-lg"
															: item.level === "h3"
															? "font-medium text-base"
															: "text-base"
													}`}>
													{item.content}
												</span>
												<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
													{index > 0 && (
														<Button
															variant="ghost"
															size="icon"
															onClick={() => handleMoveUp(index)}>
															<MoveUp className="h-4 w-4" />
														</Button>
													)}
													{index < outline.length - 1 && (
														<Button
															variant="ghost"
															size="icon"
															onClick={() => handleMoveDown(index)}>
															<MoveDown className="h-4 w-4" />
														</Button>
													)}
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEdit(index)}>
														<Edit2 className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleDelete(index)}
														className="text-red-500 hover:text-red-700">
														<X className="h-4 w-4" />
													</Button>
												</div>
											</div>
										)}
									</div>
								))}
							</div>

							<div className="flex justify-between items-center pt-4">
								<Button
									variant="outline"
									onClick={handleAddSection}
									className="flex items-center gap-2">
									<Plus className="h-4 w-4" />
									Add Section
								</Button>
								<div className="flex gap-3">
									<Button
										variant="outline"
										onClick={() => generateOutline(formData!)}>
										Regenerate Outline
									</Button>
									<Button
										onClick={handleContinue}
										variant="secondary"
										disabled={outline.length === 0}>
										Continue
									</Button>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</main>
	);
}
