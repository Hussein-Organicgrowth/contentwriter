"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "./ui/button";
import { Loader2, Wand2 } from "lucide-react";
import { Editor } from "@tiptap/core";

interface RewriteTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  mainKeyword: string;
  onAnalyze?: () => void;
  isLoading?: boolean;
}

const MenuBar = ({
  editor,
  onAnalyze,
  isLoading,
}: {
  editor: Editor | null;
  onAnalyze?: () => void;
  isLoading?: boolean;
}) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 p-2 flex gap-2 flex-wrap items-center justify-between bg-white sticky top-0 z-10">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive("heading", { level: 1 }) ? "bg-gray-200" : ""
          }`}
        >
          H1
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive("heading", { level: 2 }) ? "bg-gray-200" : ""
          }`}
        >
          H2
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive("heading", { level: 3 }) ? "bg-gray-200" : ""
          }`}
        >
          H3
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive("bold") ? "bg-gray-200" : ""
          }`}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive("italic") ? "bg-gray-200" : ""
          }`}
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive("bulletList") ? "bg-gray-200" : ""
          }`}
        >
          Bullet List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive("orderedList") ? "bg-gray-200" : ""
          }`}
        >
          Numbered List
        </button>
      </div>
      {onAnalyze && (
        <Button
          onClick={onAnalyze}
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Analyze Content
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default function RewriteTextEditor({
  content,
  onChange,
  mainKeyword,
  onAnalyze,
  isLoading,
}: RewriteTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Start writing or paste your content here...",
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[500px] p-4",
      },
    },
  });

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <MenuBar editor={editor} onAnalyze={onAnalyze} isLoading={isLoading} />
      <div className="relative">
        <EditorContent
          editor={editor}
          className="min-h-[500px] p-4 focus:outline-none"
        />
      </div>
    </div>
  );
}
