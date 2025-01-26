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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface RichTextEditorProps {
	content: string;
	onChange: (html: string) => void;
}

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

	// Ensure editor keeps focus when toolbar buttons are clicked
	useEffect(() => {
		if (editor) {
			editor.chain().focus().run();
		}
	}, [editor]);

	return (
		<div className="h-full flex flex-col overflow-hidden rounded-md border bg-background">
			<MenuBar editor={editor} />
			<div
				className="flex-1 overflow-y-auto p-4 min-h-0"
				onClick={() => editor?.chain().focus().run()}>
				<EditorContent
					editor={editor}
					className="prose prose-sm max-w-none [&_p]:leading-relaxed [&_p]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-3 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-2"
				/>
			</div>
		</div>
	);
}
