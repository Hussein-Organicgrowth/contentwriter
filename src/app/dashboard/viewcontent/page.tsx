"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "react-hot-toast";

interface Content {
	_id: string;
	title: string;
	html: string;
	date: string;
	status: "Published" | "Draft";
	contentType: string;
	mainKeyword: string;
	relatedKeywords: string[];
}

export default function ViewContent() {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [items, setItems] = useState<Content[]>([]);
	const [loading, setLoading] = useState(true);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [selectedContent, setSelectedContent] = useState<Content | null>(null);

	useEffect(() => {
		fetchContent();
	}, []);

	const fetchContent = async () => {
		try {
			const companyName = localStorage.getItem("company");
			if (!companyName) {
				throw new Error("No company selected");
			}

			const response = await fetch("/api/website");
			const data = await response.json();

			if (data.websites) {
				const website = data.websites.find(
					(w: any) => w.name.toLowerCase() === companyName.toLowerCase()
				);

				if (website && website.content) {
					setItems(website.content);
				}
			}
		} catch (error) {
			console.error("Error fetching content:", error);
			toast.error("Failed to fetch content");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedContent) return;

		try {
			const response = await fetch(`/api/content/delete`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ contentId: selectedContent._id }),
			});

			if (!response.ok) {
				throw new Error("Failed to delete content");
			}

			setItems(items.filter((item) => item._id !== selectedContent._id));
			toast.success("Content deleted successfully");
			setShowDeleteDialog(false);
			setSelectedContent(null);
		} catch (error) {
			console.error("Error deleting content:", error);
			toast.error("Failed to delete content");
		}
	};

	// Filter content based on search query
	const filteredContent = items.filter((item) =>
		item.title.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Sort content by date
	const sortedContent = [...filteredContent].sort((a, b) => {
		const dateA = new Date(a.date).getTime();
		const dateB = new Date(b.date).getTime();
		return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
	});

	const toggleSort = () => {
		setSortOrder(sortOrder === "asc" ? "desc" : "asc");
	};

	const updateStatus = async (id: string, newStatus: "Published" | "Draft") => {
		try {
			const response = await fetch(`/api/content/update-status`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ contentId: id, status: newStatus }),
			});

			if (!response.ok) {
				throw new Error("Failed to update status");
			}

			setItems(
				items.map((item) =>
					item._id === id ? { ...item, status: newStatus } : item
				)
			);
		} catch (error) {
			console.error("Error updating status:", error);
		}
	};

	const handleViewContent = (contentId: string) => {
		router.push(`/dashboard/viewcontent/${contentId}`);
	};

	const handleGenerateNew = () => {
		router.push("/content/singlecontent");
	};

	const formatContentType = (type: string) => {
		return type
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(" ");
	};

	const getWordCount = (html: string) => {
		// Remove HTML tags and get plain text
		const plainText = html.replace(/<[^>]*>/g, " ");
		// Remove extra spaces and split by whitespace
		const words = plainText.trim().split(/\s+/);
		// Filter out empty strings
		return words.filter((word) => word.length > 0).length;
	};

	return (
		<div className="container mx-auto p-6">
			<div className="flex flex-col space-y-6">
				<div className="flex items-center justify-between mb-8">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">
							Content Library
						</h1>
						<p className="text-muted-foreground">
							Browse and manage your generated content
						</p>
					</div>
					<Button className="gap-2" onClick={handleGenerateNew}>
						<Plus className="h-4 w-4" /> Generate New Content
					</Button>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>All Content</CardTitle>
						<CardDescription>
							A list of all your generated content across different types
						</CardDescription>
						<div className="mt-4">
							<div className="relative">
								<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search content..."
									className="pl-8"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="flex justify-center items-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
							</div>
						) : (
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Title</TableHead>
											<TableHead>Type</TableHead>
											<TableHead>Words</TableHead>
											<TableHead>Status</TableHead>
											<TableHead
												onClick={toggleSort}
												className="cursor-pointer">
												<div className="flex items-center">
													Date Created
													<ArrowUpDown className="ml-2 h-4 w-4" />
												</div>
											</TableHead>
											<TableHead className="text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{sortedContent.map((item) => (
											<TableRow key={item._id}>
												<TableCell className="font-medium">
													{item.title}
												</TableCell>
												<TableCell>
													{formatContentType(item.contentType)}
												</TableCell>
												<TableCell>
													{getWordCount(item.html).toLocaleString()} words
												</TableCell>
												<TableCell>
													<Popover>
														<PopoverTrigger asChild>
															<button
																className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:cursor-pointer hover:opacity-80 ${
																	item.status === "Published"
																		? "bg-green-100 text-green-800"
																		: "bg-yellow-100 text-yellow-800"
																}`}>
																{item.status}
															</button>
														</PopoverTrigger>
														<PopoverContent className="w-[200px] p-3">
															<div className="space-y-2">
																<h4 className="font-medium leading-none">
																	Status
																</h4>
																<p className="text-sm text-muted-foreground">
																	Change the content status
																</p>
																<Select
																	value={item.status}
																	onValueChange={(
																		value: "Published" | "Draft"
																	) => updateStatus(item._id, value)}>
																	<SelectTrigger>
																		<SelectValue placeholder="Select status" />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="Published">
																			Published
																		</SelectItem>
																		<SelectItem value="Draft">Draft</SelectItem>
																	</SelectContent>
																</Select>
															</div>
														</PopoverContent>
													</Popover>
												</TableCell>
												<TableCell>
													{new Date(item.date).toLocaleDateString()}
												</TableCell>
												<TableCell className="text-right space-x-2">
													<Button
														variant="secondary"
														size="sm"
														onClick={() => handleViewContent(item._id)}>
														View
													</Button>
													<Button
														variant="destructive"
														size="sm"
														onClick={() => {
															setSelectedContent(item);
															setShowDeleteDialog(true);
														}}>
														<Trash2 className="h-4 w-4" />
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}

						{!loading && sortedContent.length === 0 && (
							<div className="flex flex-col items-center justify-center py-10 text-center">
								<Search className="h-10 w-10 text-muted-foreground mb-4" />
								<p className="text-muted-foreground text-lg">
									No content found
								</p>
								<p className="text-sm text-muted-foreground">
									Try adjusting your search or generate new content
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete "
							{selectedContent?.title}" and remove it from our servers.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setSelectedContent(null)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-red-600 hover:bg-red-700">
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
