"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import {
	Loader2,
	ArrowLeft,
	Plus,
	X,
	MoveUp,
	MoveDown,
	Edit2,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
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
}

interface BulkContentData {
	entries: ContentEntry[];
	language: string;
	targetCountry: string;
	selectedWebsite: Website;
}

export default function BulkOutlinePage() {
	const router = useRouter();
	const [entries, setEntries] = useState<ContentEntry[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [editingIndex, setEditingIndex] = useState<{
		entryId: string;
		outlineIndex: number;
	} | null>(null);
	const [editingText, setEditingText] = useState("");
	const [editingLevel, setEditingLevel] = useState<"h2" | "h3" | "h4">("h2");
	const [bulkData, setBulkData] = useState<BulkContentData | null>(null);

	const generateOutline = useCallback(
		async (
			keyword: string,
			title: string,
			contentType: string,
			language: string,
			targetCountry: string
		) => {
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
				const result = await response.json();
				if (result.outline) {
					return result.outline
						.filter((line: string) => line.trim() !== "")
						.map((line: string) => {
							const content = line.replace(/^(H[234]:\s*)/, "").trim();
							let level: "h2" | "h3" | "h4" = "h2";

							if (line.startsWith("H3:")) level = "h3";
							else if (line.startsWith("H4:")) level = "h4";

							return { content, level };
						})
						.filter((item: OutlineItem) => item.content !== "");
				}
				return [];
			} catch (error) {
				console.error("Error generating outline:", error);
				toast.error("Failed to generate outline");
				return [];
			}
		},
		[]
	);

	useEffect(() => {
		const initializeData = async () => {
			const storedData = localStorage.getItem("bulkContentEntries");
			if (!storedData) {
				router.push("/content/bulkcontent");
				return;
			}

			try {
				const parsedData: BulkContentData = JSON.parse(storedData);
				setBulkData(parsedData);

				setIsLoading(true);
				const entriesWithOutlines = await Promise.all(
					parsedData.entries.map(async (entry) => ({
						...entry,
						outline: await generateOutline(
							entry.keyword,
							entry.title,
							entry.contentType,
							parsedData.language,
							parsedData.targetCountry
						),
						isExpanded: true,
					}))
				);
				setEntries(entriesWithOutlines);
				setIsLoading(false);
			} catch (error) {
				console.error("Error parsing stored data:", error);
				router.push("/content/bulkcontent");
			}
		};

		initializeData();
	}, [router, generateOutline]);

	const handleMoveUp = (entryId: string, outlineIndex: number) => {
		if (outlineIndex > 0) {
			setEntries((prevEntries) =>
				prevEntries.map((entry) => {
					if (entry.id === entryId) {
						const newOutline = [...entry.outline];
						[newOutline[outlineIndex], newOutline[outlineIndex - 1]] = [
							newOutline[outlineIndex - 1],
							newOutline[outlineIndex],
						];
						return { ...entry, outline: newOutline };
					}
					return entry;
				})
			);
		}
	};

	const handleMoveDown = (entryId: string, outlineIndex: number) => {
		setEntries((prevEntries) =>
			prevEntries.map((entry) => {
				if (entry.id === entryId && outlineIndex < entry.outline.length - 1) {
					const newOutline = [...entry.outline];
					[newOutline[outlineIndex], newOutline[outlineIndex + 1]] = [
						newOutline[outlineIndex + 1],
						newOutline[outlineIndex],
					];
					return { ...entry, outline: newOutline };
				}
				return entry;
			})
		);
	};

	const handleEdit = (entryId: string, outlineIndex: number) => {
		const entry = entries.find((e) => e.id === entryId);
		if (entry) {
			setEditingIndex({ entryId, outlineIndex });
			setEditingText(entry.outline[outlineIndex].content);
			setEditingLevel(entry.outline[outlineIndex].level);
		}
	};

	const handleSaveEdit = () => {
		if (editingIndex) {
			setEntries((prevEntries) =>
				prevEntries.map((entry) => {
					if (entry.id === editingIndex.entryId) {
						const newOutline = [...entry.outline];
						newOutline[editingIndex.outlineIndex] = {
							content: editingText,
							level: editingLevel,
						};
						return { ...entry, outline: newOutline };
					}
					return entry;
				})
			);
			setEditingIndex(null);
			setEditingText("");
		}
	};

	const handleDelete = (entryId: string, outlineIndex: number) => {
		setEntries((prevEntries) =>
			prevEntries.map((entry) => {
				if (entry.id === entryId) {
					const newOutline = entry.outline.filter((_, i) => i !== outlineIndex);
					return { ...entry, outline: newOutline };
				}
				return entry;
			})
		);
	};

	const handleAddSection = (entryId: string) => {
		setEntries((prevEntries) =>
			prevEntries.map((entry) => {
				if (entry.id === entryId) {
					const newOutline: OutlineItem[] = [
						...entry.outline,
						{ content: "New Section", level: "h2" as const },
					];
					return { ...entry, outline: newOutline };
				}
				return entry;
			})
		);
		const entry = entries.find((e) => e.id === entryId);
		if (entry) {
			handleEdit(entryId, entry.outline.length);
		}
	};

	const handleRegenerateOutline = async (entryId: string) => {
		const entry = entries.find((e) => e.id === entryId);
		if (!entry || !bulkData) return;

		setIsLoading(true);
		const newOutline = await generateOutline(
			entry.keyword,
			entry.title,
			entry.contentType,
			bulkData.language,
			bulkData.targetCountry
		);

		setEntries((prevEntries) =>
			prevEntries.map((e) =>
				e.id === entryId ? { ...e, outline: newOutline } : e
			)
		);
		setIsLoading(false);
	};

	const toggleExpand = (entryId: string) => {
		setEntries((prevEntries) =>
			prevEntries.map((entry) =>
				entry.id === entryId
					? { ...entry, isExpanded: !entry.isExpanded }
					: entry
			)
		);
	};

	const handleBack = () => {
		router.push("/content/bulkcontent");
	};

	const handleContinue = () => {
		if (!bulkData) return;

		// Store the entries with outlines in localStorage
		localStorage.setItem(
			"bulkContentOutlines",
			JSON.stringify({
				...bulkData,
				entries,
			})
		);

		// Navigate to content generation page
		router.push("/content/bulkcontent/generate");
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
							Content Outlines
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="pt-6">
					{isLoading ? (
						<div className="flex flex-col items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-4" />
							<p className="text-gray-500">Generating outlines...</p>
						</div>
					) : (
						<div className="space-y-6">
							{entries.map((entry) => (
								<Card key={entry.id} className="border bg-gray-50">
									<CardContent className="pt-6">
										<div className="flex justify-between items-center mb-4">
											<div className="space-y-1">
												<Badge variant="secondary">Content #{entry.id}</Badge>
												<h3 className="text-lg font-semibold">{entry.title}</h3>
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => toggleExpand(entry.id)}>
												{entry.isExpanded ? (
													<ChevronUp className="h-4 w-4" />
												) : (
													<ChevronDown className="h-4 w-4" />
												)}
											</Button>
										</div>

										{entry.isExpanded && (
											<div className="space-y-4">
												{entry.outline.map((item, index) => (
													<div
														key={index}
														className="flex items-start gap-3 p-3 bg-white rounded-lg group">
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
														{editingIndex?.entryId === entry.id &&
														editingIndex.outlineIndex === index ? (
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
																	onChange={(e) =>
																		setEditingText(e.target.value)
																	}
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
																			onClick={() =>
																				handleMoveUp(entry.id, index)
																			}>
																			<MoveUp className="h-4 w-4" />
																		</Button>
																	)}
																	{index < entry.outline.length - 1 && (
																		<Button
																			variant="ghost"
																			size="icon"
																			onClick={() =>
																				handleMoveDown(entry.id, index)
																			}>
																			<MoveDown className="h-4 w-4" />
																		</Button>
																	)}
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() => handleEdit(entry.id, index)}>
																		<Edit2 className="h-4 w-4" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={() =>
																			handleDelete(entry.id, index)
																		}
																		className="text-red-500 hover:text-red-700">
																		<X className="h-4 w-4" />
																	</Button>
																</div>
															</div>
														)}
													</div>
												))}

												<div className="flex justify-between items-center pt-4">
													<Button
														variant="outline"
														onClick={() => handleAddSection(entry.id)}
														className="flex items-center gap-2">
														<Plus className="h-4 w-4" />
														Add Section
													</Button>
													<Button
														variant="outline"
														onClick={() => handleRegenerateOutline(entry.id)}>
														Regenerate Outline
													</Button>
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							))}

							<div className="flex justify-end pt-4">
								<Button
									onClick={handleContinue}
									variant="secondary"
									disabled={entries.some((e) => e.outline.length === 0)}>
									Continue
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</main>
	);
}
