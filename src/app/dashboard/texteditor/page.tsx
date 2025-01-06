"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
	Bold,
	Italic,
	Underline as UnderlineIcon,
	AlignLeft,
	AlignCenter,
	AlignRight,
	Link as LinkIcon,
	List,
	ListOrdered,
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6,
	Pilcrow,
	Type,
	Save,
	Check,
	Wand2,
	MessageSquare,
	ArrowRightCircle,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";

type SaveStatus = "saved" | "saving" | "unsaved";
type AiAction = "expand" | "improve" | "explain";

interface AiContextMenu {
	show: boolean;
	x: number;
	y: number;
	selectedText: string;
}

interface TextEditorProps {
	initialContent: string;
	contentId: string;
}

const MenuBar = ({
	editor,
	onSave,
	saveStatus,
	wordCount,
}: {
	editor: Editor | null;
	onSave: () => Promise<void>;
	saveStatus: SaveStatus;
	wordCount: number;
}) => {
	const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
	const [linkUrl, setLinkUrl] = useState("");
	const [showHeadings, setShowHeadings] = useState(false);

	// Close dropdowns when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showHeadings || isLinkModalOpen) {
				const target = event.target as HTMLElement;
				if (!target.closest(".toolbar-dropdown")) {
					setShowHeadings(false);
					setIsLinkModalOpen(false);
				}
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [showHeadings, isLinkModalOpen]);

	const addLink = useCallback(
		(e: React.MouseEvent | React.FormEvent) => {
			e.preventDefault();
			if (linkUrl) {
				const url = linkUrl.startsWith("/")
					? linkUrl
					: linkUrl.startsWith("http")
					? linkUrl
					: `https://${linkUrl}`;

				editor?.chain().focus().setLink({ href: url }).run();
				setLinkUrl("");
				setIsLinkModalOpen(false);
			}
		},
		[editor, linkUrl]
	);

	const removeLink = useCallback(() => {
		editor?.chain().focus().unsetLink().run();
		setIsLinkModalOpen(false);
	}, [editor]);

	if (!editor) {
		return null;
	}

	const ToolbarButton = ({
		isActive,
		onClick,
		children,
		tooltip,
	}: {
		isActive: boolean;
		onClick: () => void;
		children: React.ReactNode;
		tooltip?: string;
	}) => (
		<button
			type="button"
			onMouseDown={(e) => {
				e.preventDefault(); // Prevent losing focus
				onClick();
			}}
			className={`p-2 rounded-md hover:bg-gray-100 transition-all relative group ${
				isActive ? "bg-gray-100 text-blue-600" : "text-gray-700"
			}`}
			title={tooltip}>
			{children}
			{tooltip && (
				<div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs text-white bg-gray-800 rounded mb-1 whitespace-nowrap">
					{tooltip}
				</div>
			)}
		</button>
	);

	const ToolbarDivider = () => <div className="w-px h-6 bg-gray-200 mx-1" />;

	return (
		<div className="sticky top-0 z-50 bg-white border-b border-gray-200">
			<div className="flex items-center justify-between p-2">
				<div className="flex items-center gap-1">
					{/* Headings Dropdown */}
					<div className="relative toolbar-dropdown">
						<ToolbarButton
							isActive={false}
							onClick={() => setShowHeadings(!showHeadings)}
							tooltip="Text style">
							<Type className="w-5 h-5" />
						</ToolbarButton>

						{showHeadings && (
							<div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-48 z-50">
								{[
									{ level: 1 as const, icon: Heading1, label: "Heading 1" },
									{ level: 2 as const, icon: Heading2, label: "Heading 2" },
									{ level: 3 as const, icon: Heading3, label: "Heading 3" },
									{ level: 4 as const, icon: Heading4, label: "Heading 4" },
									{ level: 5 as const, icon: Heading5, label: "Heading 5" },
									{ level: 6 as const, icon: Heading6, label: "Heading 6" },
									{
										level: "paragraph" as const,
										icon: Pilcrow,
										label: "Paragraph",
									},
								].map(({ level, icon: Icon, label }) => (
									<button
										key={level}
										onMouseDown={(e) => {
											e.preventDefault();
											setShowHeadings(false);
											if (level === "paragraph") {
												editor.chain().focus().setParagraph().run();
											} else {
												editor.chain().focus().toggleHeading({ level }).run();
											}
										}}
										className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-gray-100 ${
											(level === "paragraph" && editor.isActive("paragraph")) ||
											editor.isActive("heading", { level })
												? "bg-gray-100 text-blue-600"
												: "text-gray-700"
										}`}>
										<Icon className="w-4 h-4" />
										<span className="text-sm">{label}</span>
									</button>
								))}
							</div>
						)}
					</div>

					<ToolbarDivider />

					{/* Text Format Group */}
					<ToolbarButton
						isActive={editor.isActive("bold")}
						onClick={() => editor.chain().focus().toggleBold().run()}
						tooltip="Bold">
						<Bold className="w-5 h-5" />
					</ToolbarButton>
					<ToolbarButton
						isActive={editor.isActive("italic")}
						onClick={() => editor.chain().focus().toggleItalic().run()}
						tooltip="Italic">
						<Italic className="w-5 h-5" />
					</ToolbarButton>
					<ToolbarButton
						isActive={editor.isActive("underline")}
						onClick={() => editor.chain().focus().toggleUnderline().run()}
						tooltip="Underline">
						<UnderlineIcon className="w-5 h-5" />
					</ToolbarButton>

					<ToolbarDivider />

					{/* List Group */}
					<ToolbarButton
						isActive={editor.isActive("bulletList")}
						onClick={() => editor.chain().focus().toggleBulletList().run()}
						tooltip="Bullet list">
						<List className="w-5 h-5" />
					</ToolbarButton>
					<ToolbarButton
						isActive={editor.isActive("orderedList")}
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
						tooltip="Numbered list">
						<ListOrdered className="w-5 h-5" />
					</ToolbarButton>

					<ToolbarDivider />

					{/* Alignment Group */}
					<ToolbarButton
						isActive={editor.isActive({ textAlign: "left" })}
						onClick={() => editor.chain().focus().setTextAlign("left").run()}
						tooltip="Align left">
						<AlignLeft className="w-5 h-5" />
					</ToolbarButton>
					<ToolbarButton
						isActive={editor.isActive({ textAlign: "center" })}
						onClick={() => editor.chain().focus().setTextAlign("center").run()}
						tooltip="Align center">
						<AlignCenter className="w-5 h-5" />
					</ToolbarButton>
					<ToolbarButton
						isActive={editor.isActive({ textAlign: "right" })}
						onClick={() => editor.chain().focus().setTextAlign("right").run()}
						tooltip="Align right">
						<AlignRight className="w-5 h-5" />
					</ToolbarButton>

					<ToolbarDivider />

					{/* Link Group */}
					<div className="relative toolbar-dropdown">
						<ToolbarButton
							isActive={editor.isActive("link")}
							onClick={() => setIsLinkModalOpen(!isLinkModalOpen)}
							tooltip={editor.isActive("link") ? "Edit link" : "Add link"}>
							<LinkIcon className="w-5 h-5" />
						</ToolbarButton>

						{/* Link Modal */}
						{isLinkModalOpen && (
							<div className="fixed top-[var(--toolbar-top)] left-[var(--toolbar-left)] mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 w-72 z-[60]">
								{editor.isActive("link") ? (
									<div className="flex flex-col gap-2">
										<div className="text-sm text-gray-600 mb-1">
											Current link:
										</div>
										<div className="text-sm bg-gray-50 p-2 rounded break-all">
											{editor.getAttributes("link").href}
										</div>
										<div className="flex gap-2">
											<Button
												type="button"
												size="sm"
												variant="destructive"
												onClick={removeLink}
												className="w-full">
												Remove Link
											</Button>
											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={() => setIsLinkModalOpen(false)}>
												Cancel
											</Button>
										</div>
									</div>
								) : (
									<form onSubmit={addLink}>
										<div className="flex flex-col gap-2">
											<input
												type="text"
												placeholder="Enter URL or internal path (/about)"
												value={linkUrl}
												onChange={(e) => setLinkUrl(e.target.value)}
												className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
												autoFocus
											/>
											<div className="flex gap-2">
												<Button
													type="submit"
													size="sm"
													variant="secondary"
													className="w-full">
													Add Link
												</Button>
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => {
														setIsLinkModalOpen(false);
														setLinkUrl("");
													}}>
													Cancel
												</Button>
											</div>
										</div>
									</form>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Save Status and Word Count */}
				<div className="flex items-center gap-4">
					<div className="text-sm text-gray-500 flex items-center gap-2">
						<div className="h-4 w-px bg-gray-200" />
						<span>{wordCount.toLocaleString()} words</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm text-gray-500">
							{saveStatus === "saving" && (
								<span className="flex items-center gap-1 text-blue-600">
									<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
											fill="none"
										/>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										/>
									</svg>
									Saving...
								</span>
							)}
							{saveStatus === "saved" && (
								<span className="flex items-center gap-1 text-green-600">
									<Check className="w-4 h-4" /> Saved
								</span>
							)}
							{saveStatus === "unsaved" && (
								<span className="text-amber-600">Unsaved changes</span>
							)}
						</span>
						<Button
							size="sm"
							variant="outline"
							onClick={() => onSave()}
							className="flex items-center gap-1"
							disabled={saveStatus === "saving"}>
							<Save className="w-4 h-4" />
							Save
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

const TextEditor = ({ initialContent, contentId }: TextEditorProps) => {
	const [html, setHtml] = useState(initialContent);
	const [lastSavedHtml, setLastSavedHtml] = useState(initialContent);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
	const [aiContextMenu, setAiContextMenu] = useState<AiContextMenu>({
		show: false,
		x: 0,
		y: 0,
		selectedText: "",
	});
	const [isProcessing, setIsProcessing] = useState(false);
	const toolbarRef = useRef<HTMLDivElement | null>(null);
	const autoSaveTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const [explainDialogOpen, setExplainDialogOpen] = useState(false);
	const [explainFocus, setExplainFocus] = useState("");
	const [selectedAction, setSelectedAction] = useState<AiAction | null>(null);
	const [wordCount, setWordCount] = useState(0);

	const getWordCount = (html: string) => {
		// Remove HTML tags and get plain text
		const plainText = html.replace(/<[^>]*>/g, " ");
		// Remove extra spaces and split by whitespace
		const words = plainText.trim().split(/\s+/);
		// Filter out empty strings
		return words.filter((word) => word.length > 0).length;
	};

	// Update word count when content changes
	useEffect(() => {
		setWordCount(getWordCount(html));
	}, [html]);

	// Function to save content
	const saveContent = useCallback(async () => {
		try {
			setSaveStatus("saving");

			const response = await fetch(`/api/content/update`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					contentId,
					html,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to save content");
			}

			setLastSavedHtml(html);
			setSaveStatus("saved");
			toast.success("Content saved successfully");
		} catch (error) {
			console.error("Error saving content:", error);
			setSaveStatus("unsaved");
			toast.error("Failed to save content");
		}
	}, [html, contentId]);

	// Update save status when content changes
	useEffect(() => {
		if (html !== lastSavedHtml) {
			setSaveStatus("unsaved");
		}
	}, [html, lastSavedHtml]);

	// Set up auto-save
	useEffect(() => {
		if (html !== lastSavedHtml) {
			if (autoSaveTimerRef.current) {
				clearTimeout(autoSaveTimerRef.current);
			}

			autoSaveTimerRef.current = setTimeout(() => {
				saveContent();
			}, 5000); // 5 seconds
		}

		return () => {
			if (autoSaveTimerRef.current) {
				clearTimeout(autoSaveTimerRef.current);
			}
		};
	}, [html, lastSavedHtml, saveContent]);

	useEffect(() => {
		if (toolbarRef.current) {
			const updateToolbarPosition = () => {
				const toolbar = toolbarRef.current;
				if (toolbar) {
					const rect = toolbar.getBoundingClientRect();
					document.documentElement.style.setProperty(
						"--toolbar-top",
						`${rect.bottom}px`
					);
					document.documentElement.style.setProperty(
						"--toolbar-left",
						`${rect.left}px`
					);
				}
			};

			updateToolbarPosition();
			window.addEventListener("resize", updateToolbarPosition);
			window.addEventListener("scroll", updateToolbarPosition);

			return () => {
				window.removeEventListener("resize", updateToolbarPosition);
				window.removeEventListener("scroll", updateToolbarPosition);
			};
		}
	}, []);

	// Handle AI actions
	const handleAiAction = async (action: AiAction) => {
		if (!editor || !aiContextMenu.selectedText) return;

		if (action === "explain") {
			setSelectedAction(action);
			setExplainDialogOpen(true);
			return;
		}

		await processAiAction(action);
	};

	const processAiAction = async (action: AiAction, focus?: string) => {
		if (!editor) return;

		setIsProcessing(true);
		try {
			const response = await fetch("/api/enhance-text", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					text: aiContextMenu.selectedText,
					action,
					focus,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to enhance text");
			}

			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) {
				throw new Error("No reader available");
			}

			// For all actions, stream directly into the editor
			const { from, to } = editor.state.selection;

			// Clear the existing text first
			editor
				.chain()
				.focus()
				.command(({ tr }) => {
					tr.insertText("", from, to);
					return true;
				})
				.run();

			let position = from;
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(5).trim();
						if (data === "[DONE]") continue;
						if (!data) continue;

						try {
							const parsed = JSON.parse(data);
							if (parsed.content) {
								editor
									.chain()
									.focus()
									.command(({ tr }) => {
										tr.insertText(parsed.content, position);
										position += parsed.content.length;
										return true;
									})
									.run();
							}
						} catch (e) {
							console.error("Failed to parse chunk:", e);
						}
					}
				}
			}
		} catch (error) {
			console.error("Error processing AI action:", error);
			alert("Failed to process text. Please try again.");
		} finally {
			setIsProcessing(false);
			setAiContextMenu({ show: false, x: 0, y: 0, selectedText: "" });
			setExplainDialogOpen(false);
			setExplainFocus("");
			setSelectedAction(null);
		}
	};

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3, 4, 5, 6],
				},
			}),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "text-blue-600 underline hover:text-blue-800",
				},
			}),
			Image,
			Underline,
			TextAlign.configure({
				types: ["heading", "paragraph"],
			}),
			Placeholder.configure({
				placeholder: "Start writing...",
			}),
		],
		content: html,
		onUpdate: ({ editor }) => {
			const newHtml = editor.getHTML();
			setHtml(newHtml);
		},
		onSelectionUpdate: ({ editor }) => {
			const { from, to } = editor.state.selection;
			const text = editor.state.doc.textBetween(from, to);

			if (text && text.length > 0) {
				// Get the selection coordinates
				const view = editor.view;
				const { ranges } = view.state.selection;
				const from = view.coordsAtPos(ranges[0].$from.pos);
				const to = view.coordsAtPos(ranges[0].$to.pos);

				setAiContextMenu({
					show: true,
					x: (from.left + to.left) / 2,
					y: from.top - 10,
					selectedText: text,
				});
			} else {
				setAiContextMenu({ show: false, x: 0, y: 0, selectedText: "" });
			}
		},
		editorProps: {
			attributes: {
				class: "prose prose-lg max-w-none min-h-[200px] p-4 focus:outline-none",
			},
		},
		autofocus: true,
	});

	return (
		<div className="w-full max-w-6xl mx-auto p-4">
			<div className="border rounded-lg shadow-sm bg-white" ref={toolbarRef}>
				<MenuBar
					editor={editor}
					onSave={saveContent}
					saveStatus={saveStatus}
					wordCount={wordCount}
				/>
				<EditorContent editor={editor} className="min-h-[500px]" />

				{/* AI Context Menu */}
				{aiContextMenu.show && (
					<div
						className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 px-1 z-[70]"
						style={{
							left: `${aiContextMenu.x}px`,
							top: `${aiContextMenu.y}px`,
							transform: "translate(-50%, -100%)",
						}}>
						<div className="flex gap-1">
							<Button
								size="sm"
								variant="ghost"
								className="flex items-center gap-1 text-xs"
								onClick={() => handleAiAction("expand")}
								disabled={isProcessing}>
								<ArrowRightCircle className="w-4 h-4" />
								Expand
							</Button>
							<Button
								size="sm"
								variant="ghost"
								className="flex items-center gap-1 text-xs"
								onClick={() => handleAiAction("improve")}
								disabled={isProcessing}>
								<Wand2 className="w-4 h-4" />
								Improve
							</Button>
							<Button
								size="sm"
								variant="ghost"
								className="flex items-center gap-1 text-xs"
								onClick={() => handleAiAction("explain")}
								disabled={isProcessing}>
								<MessageSquare className="w-4 h-4" />
								Explain
							</Button>
						</div>
					</div>
				)}
			</div>

			{/* Input Dialog for Explain */}
			<Dialog open={explainDialogOpen} onOpenChange={setExplainDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>How would you like to improve this text?</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<Input
							placeholder="e.g., make it more formal, simplify it, make it more engaging..."
							value={explainFocus}
							onChange={(e) => setExplainFocus(e.target.value)}
							className="w-full"
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setExplainDialogOpen(false);
								setExplainFocus("");
								setSelectedAction(null);
							}}>
							Cancel
						</Button>
						<Button
							variant="secondary"
							onClick={() => {
								if (selectedAction) {
									processAiAction(selectedAction, explainFocus);
								}
							}}
							disabled={!explainFocus.trim() || isProcessing}>
							{isProcessing ? "Processing..." : "Improve Text"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

interface PageProps {
	params: { contentId?: string };
	searchParams: { [key: string]: string | string[] | undefined };
}

export default function TextEditorPage(props: PageProps) {
	return null; // This page should not be rendered directly
}

export { TextEditor };
