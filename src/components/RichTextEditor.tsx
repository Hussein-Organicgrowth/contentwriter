import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Button } from "./ui/button";
import {
	Bold,
	Italic,
	Strikethrough,
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	Link as LinkIcon,
	Image as ImageIcon,
	Undo,
	Redo,
	Pilcrow,
	Link2Off,
	Wand2,
	Expand,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

interface RichTextEditorProps {
	content: string;
	onChange: (html: string) => void;
}

const AIMenu = ({
	editor,
	selectedText,
}: {
	editor: Editor | null;
	selectedText: string;
}) => {
	const [isLoading, setIsLoading] = useState(false);

	const improveText = async () => {
		if (!editor || !selectedText) return;

		setIsLoading(true);
		try {
			// Replace this with your actual AI API call
			const response = await fetch("/api/ai/improve", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: selectedText }),
			});

			const data = await response.json();

			if (data.improvedText) {
				editor.chain().focus().insertContent(data.improvedText).run();
			}
		} catch (error) {
			console.error("Error improving text:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const expandText = async () => {
		if (!editor || !selectedText) return;

		setIsLoading(true);
		try {
			// Replace this with your actual AI API call
			const response = await fetch("/api/ai/expand", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: selectedText }),
			});

			const data = await response.json();

			if (data.expandedText) {
				editor.chain().focus().insertContent(data.expandedText).run();
			}
		} catch (error) {
			console.error("Error expanding text:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex gap-1 bg-white rounded-md shadow-lg border p-1 z-[100]">
			<Button
				variant="ghost"
				size="sm"
				onClick={improveText}
				disabled={isLoading}
				className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
				title="Improve text">
				{isLoading ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Wand2 className="h-4 w-4" />
				)}
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onClick={expandText}
				disabled={isLoading}
				className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
				title="Expand text">
				{isLoading ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Expand className="h-4 w-4" />
				)}
			</Button>
		</div>
	);
};

const MenuBar = ({ editor }: { editor: Editor | null }) => {
	if (!editor) {
		return null;
	}

	const addLink = () => {
		const previousUrl = editor.getAttributes("link").href;
		const url = window.prompt("Link URL", previousUrl);

		// cancelled
		if (url === null) {
			return;
		}

		// empty
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}

		// update link
		editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
	};

	const removeLink = () => {
		editor.chain().focus().unsetLink().run();
	};

	const addImage = () => {
		const url = window.prompt("Image URL");
		if (url) {
			editor.chain().focus().setImage({ src: url }).run();
		}
	};

	const ToolbarButton = ({
		onClick,
		isActive = false,
		disabled = false,
		title,
		children,
	}: {
		onClick: () => void;
		isActive?: boolean;
		disabled?: boolean;
		title: string;
		children: React.ReactNode;
	}) => (
		<Button
			variant={isActive ? "ghost" : "ghost"}
			size="sm"
			onClick={(e) => {
				e.preventDefault();
				onClick();
			}}
			onMouseDown={(e) => e.preventDefault()}
			disabled={disabled}
			className={cn(
				"h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600",
				isActive && "bg-blue-100 text-blue-600"
			)}
			title={title}>
			{children}
		</Button>
	);

	return (
		<div
			className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50"
			onMouseDown={(e) => e.preventDefault()}>
			<div className="flex items-center gap-1 mr-2 border-r pr-2">
				<ToolbarButton
					onClick={() => editor.chain().focus().undo().run()}
					disabled={!editor.can().undo()}
					title="Undo">
					<Undo className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					onClick={() => editor.chain().focus().redo().run()}
					disabled={!editor.can().redo()}
					title="Redo">
					<Redo className="h-4 w-4" />
				</ToolbarButton>
			</div>

			<div className="flex items-center gap-1 mr-2 border-r pr-2">
				<ToolbarButton
					onClick={() => editor.chain().focus().toggleBold().run()}
					isActive={editor.isActive("bold")}
					title="Bold">
					<Bold className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					onClick={() => editor.chain().focus().toggleItalic().run()}
					isActive={editor.isActive("italic")}
					title="Italic">
					<Italic className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					onClick={() => editor.chain().focus().toggleStrike().run()}
					isActive={editor.isActive("strike")}
					title="Strikethrough">
					<Strikethrough className="h-4 w-4" />
				</ToolbarButton>
			</div>

			<div className="flex items-center gap-1 mr-2 border-r pr-2">
				<ToolbarButton
					onClick={() => editor.chain().focus().setParagraph().run()}
					isActive={editor.isActive("paragraph")}
					title="Paragraph">
					<Pilcrow className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 1 }).run()
					}
					isActive={editor.isActive("heading", { level: 1 })}
					title="Heading 1">
					<Heading1 className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 2 }).run()
					}
					isActive={editor.isActive("heading", { level: 2 })}
					title="Heading 2">
					<Heading2 className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 3 }).run()
					}
					isActive={editor.isActive("heading", { level: 3 })}
					title="Heading 3">
					<Heading3 className="h-4 w-4" />
				</ToolbarButton>
			</div>

			<div className="flex items-center gap-1 mr-2 border-r pr-2">
				<ToolbarButton
					onClick={() => editor.chain().focus().toggleBulletList().run()}
					isActive={editor.isActive("bulletList")}
					title="Bullet List">
					<List className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
					isActive={editor.isActive("orderedList")}
					title="Ordered List">
					<ListOrdered className="h-4 w-4" />
				</ToolbarButton>
			</div>

			<div className="flex items-center gap-1">
				<ToolbarButton
					onClick={addLink}
					isActive={editor.isActive("link")}
					title={editor.isActive("link") ? "Edit Link" : "Add Link"}>
					<LinkIcon className="h-4 w-4" />
				</ToolbarButton>
				{editor.isActive("link") && (
					<ToolbarButton onClick={removeLink} title="Remove Link">
						<Link2Off className="h-4 w-4" />
					</ToolbarButton>
				)}
				<ToolbarButton onClick={addImage} title="Add Image">
					<ImageIcon className="h-4 w-4" />
				</ToolbarButton>
			</div>
		</div>
	);
};

export default function RichTextEditor({
	content,
	onChange,
}: RichTextEditorProps) {
	const [selectedText, setSelectedText] = useState("");
	const [showAIMenu, setShowAIMenu] = useState(false);
	const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
	const [isInitialContent, setIsInitialContent] = useState(true);
	const editorRef = useRef<HTMLDivElement>(null);
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
		null
	);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				menuRef.current &&
				!menuRef.current.contains(event.target as Node) &&
				!editorRef.current?.contains(event.target as Node)
			) {
				setShowAIMenu(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	useEffect(() => {
		// Create a container for the portal
		const container = document.createElement("div");
		container.style.position = "fixed";
		container.style.zIndex = "9999";
		document.body.appendChild(container);
		setPortalContainer(container);

		return () => {
			document.body.removeChild(container);
		};
	}, []);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
				},
			}),
			Link.configure({
				openOnClick: false,
			}),
			Image,
		],
		content,
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
		editorProps: {
			attributes: {
				class: "prose prose-sm focus:outline-none max-w-none min-h-[200px]",
			},
			handleClick: () => {
				editor?.chain().focus().run();
			},
			handleKeyDown: () => {
				editor?.chain().focus().run();
			},
		},
		autofocus: true,
	});

	useEffect(() => {
		if (editor) {
			const timer = setTimeout(() => {
				setIsInitialContent(false);
			}, 100);

			const handleSelectionUpdate = () => {
				if (isInitialContent) return;

				const { from, to } = editor.state.selection;
				const selectedText = editor.state.doc.textBetween(from, to);

				if (selectedText && from !== to) {
					const { view } = editor;
					const editorRect = editorRef.current?.getBoundingClientRect();
					const cursorPos = view.coordsAtPos(to);

					if (!editorRect) return;

					// Menu dimensions
					const menuWidth = 100;
					const menuHeight = 40;
					const padding = 10;

					// Calculate position relative to the viewport
					let x = cursorPos.left;
					let y = cursorPos.top - menuHeight - padding;

					// Check if there's enough space above
					if (y < 0) {
						// If not enough space above, position below the cursor
						y = cursorPos.top + padding;
					}

					// Ensure menu stays within editor bounds horizontally
					if (x - menuWidth / 2 < editorRect.left) {
						x = editorRect.left + menuWidth / 2;
					} else if (x + menuWidth / 2 > editorRect.right) {
						x = editorRect.right - menuWidth / 2;
					}

					setSelectedText(selectedText);
					setMenuPosition({ x, y });
					setShowAIMenu(true);
				} else {
					setShowAIMenu(false);
				}
			};

			editor.on("selectionUpdate", handleSelectionUpdate);
			editor.on("transaction", handleSelectionUpdate);

			// Add mouseup event listener to handle selection changes
			const handleMouseUp = () => {
				setTimeout(handleSelectionUpdate, 0);
			};

			const editorElement = editor.view.dom;
			editorElement.addEventListener("mouseup", handleMouseUp);

			// Add window resize listener
			window.addEventListener("resize", handleSelectionUpdate);

			return () => {
				clearTimeout(timer);
				editor.off("selectionUpdate", handleSelectionUpdate);
				editor.off("transaction", handleSelectionUpdate);
				editorElement.removeEventListener("mouseup", handleMouseUp);
				window.removeEventListener("resize", handleSelectionUpdate);
			};
		}
	}, [editor, isInitialContent]);

	return (
		<div className="h-full flex flex-col overflow-hidden rounded-md border bg-background relative">
			<MenuBar editor={editor} />
			<div
				ref={editorRef}
				className="flex-1 overflow-y-auto p-4 min-h-0 relative"
				onClick={() => editor?.chain().focus().run()}>
				<EditorContent
					editor={editor}
					className="prose prose-sm max-w-none [&_p]:leading-relaxed [&_p]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-3 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-2"
				/>
			</div>
			{showAIMenu &&
				portalContainer &&
				createPortal(
					<div
						ref={menuRef}
						style={{
							position: "fixed",
							left: `${menuPosition.x}px`,
							top: `${menuPosition.y}px`,
							transform: "translateX(-50%)",
							transition: "all 0.1s ease-in-out",
							pointerEvents: "auto",
						}}>
						<AIMenu editor={editor} selectedText={selectedText} />
					</div>,
					portalContainer
				)}
		</div>
	);
}
