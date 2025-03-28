"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
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
  Send,
  Wand2,
  Expand,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "remixicon/fonts/remixicon.css";

// Add custom extension for highlighted content
import { Node, JSONContent } from "@tiptap/core";

const HighlightedContent = Node.create({
  name: "highlightedContent",
  group: "block",
  content: "block*",
  draggable: true,
  addAttributes() {
    return {
      "data-change-id": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-change-id"),
        renderHTML: (attributes) => {
          if (!attributes["data-change-id"]) {
            return {};
          }
          return {
            "data-change-id": attributes["data-change-id"],
          };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    console.log(
      "Rendering highlighted content with attributes:",
      HTMLAttributes
    );
    const changeId = HTMLAttributes["data-change-id"];
    console.log("Change ID from attributes:", changeId);

    return [
      "div",
      {
        class:
          "relative group my-4 bg-yellow-100 p-4 rounded-lg border border-yellow-200",
        "data-change-id": changeId,
        ...HTMLAttributes,
      },
      [
        "div",
        {
          class:
            "absolute right-2 top-2 hidden group-hover:flex gap-1 bg-white shadow-md rounded-md p-1 z-50",
        },
        [
          "button",
          {
            class:
              "p-1.5 text-green-600 hover:text-green-700 rounded hover:bg-green-50 transition-colors",
            onclick: `window.handleAcceptChange('${changeId}')`,
            title: "Accept change",
            "data-testid": "accept-button",
          },
          [
            "i",
            {
              class: "ri-check-line text-xl",
            },
          ],
        ],
        [
          "button",
          {
            class:
              "p-1.5 text-red-600 hover:text-red-700 rounded hover:bg-red-50 transition-colors",
            onclick: `window.handleDeclineChange('${changeId}')`,
            title: "Decline change",
            "data-testid": "decline-button",
          },
          [
            "i",
            {
              class: "ri-close-line text-xl",
            },
          ],
        ],
      ],
      ["div", { class: "content" }, 0],
    ];
  },
  parseHTML() {
    return [
      {
        tag: 'div[class*="group"]',
        getAttrs: (node) => {
          if (typeof node === "string") return {};
          const changeId = node.getAttribute("data-change-id");
          console.log("Parsing HTML with change ID:", changeId);
          return {
            "data-change-id": changeId,
          };
        },
      },
    ];
  },
});

interface PaperCanvasProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

interface Message {
  role: "user" | "assistant" | "status";
  content: string;
}

interface ContentUpdate {
  type: "insert" | "modify" | "delete";
  position: "before" | "after" | "replace";
  target?: string;
  content: string;
  explanation: string;
}

interface PendingChange {
  update: ContentUpdate;
  content: string;
  timestamp: number;
  elementId: string;
}

// Add type for window object
declare global {
  interface Window {
    handleAcceptChange?: (id: string) => void;
    handleDeclineChange?: (id: string) => void;
  }
}

// Add this new component before the PaperCanvas component
const FloatingMenu = ({
  editor,
  onImprove,
  onExpand,
}: {
  editor: Editor;
  onImprove: () => void;
  onExpand: () => void;
}) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (!editor) return;

      const { from, to } = editor.state.selection;
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);

      const left = (start.left + end.left) / 2;
      const top = start.top - 40; // Position above the selection

      setPosition({ x: left, y: top });
    };

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      setShow(hasSelection);
      if (hasSelection) {
        updatePosition();
      }
    };

    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor]);

  if (!show) return null;

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translateX(-50%)",
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onImprove}
        className="h-8 px-3 hover:bg-gray-100 flex items-center gap-2"
        title="Improve selection"
      >
        <Wand2 className="h-4 w-4" />
        <span className="text-sm">Improve</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onExpand}
        className="h-8 px-3 hover:bg-gray-100 flex items-center gap-2"
        title="Expand selection"
      >
        <Expand className="h-4 w-4" />
        <span className="text-sm">Expand</span>
      </Button>
    </div>
  );
};

export default function PaperCanvas({
  initialContent = "",
  onContentChange,
}: PaperCanvasProps) {
  const [content, setContent] = useState(initialContent);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your writing assistant. I can help you improve your content, add new sections, or make any other changes you need. Just let me know what you'd like to do!",
    },
  ]);
  const [userInput, setUserInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      HighlightedContent,
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAcceptChange = useCallback(
    (change: PendingChange) => {
      console.log("Accepting change:", change);

      // Find and delete the highlighted content node
      editor?.state.doc.descendants((node, pos) => {
        if (
          node.type.name === "highlightedContent" &&
          node.attrs["data-change-id"] === change.elementId
        ) {
          editor
            ?.chain()
            .focus()
            .deleteRange({ from: pos, to: pos + node.nodeSize })
            .run();
        }
      });

      // Create a temporary div to parse the content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = change.content;

      // Find the highlighted content div
      const highlightedDiv = tempDiv.querySelector(".group");
      if (highlightedDiv) {
        // Remove the highlight wrapper but keep the content
        const content = highlightedDiv.querySelector(".content");
        if (content) {
          // Insert the content at the current cursor position
          editor?.chain().focus().insertContent(content.innerHTML).run();
        }
      }

      // Remove the change from pending changes
      setPendingChanges((prev) =>
        prev.filter((c) => c.timestamp !== change.timestamp)
      );
    },
    [editor]
  );

  const handleDeclineChange = useCallback(
    (change: PendingChange) => {
      console.log("Declining change:", change);

      // Find and delete the highlighted content node
      editor?.state.doc.descendants((node, pos) => {
        if (
          node.type.name === "highlightedContent" &&
          node.attrs["data-change-id"] === change.elementId
        ) {
          editor
            ?.chain()
            .focus()
            .deleteRange({ from: pos, to: pos + node.nodeSize })
            .run();
        }
      });

      // Remove the change from pending changes
      setPendingChanges((prev) =>
        prev.filter((c) => c.timestamp !== change.timestamp)
      );
    },
    [editor]
  );

  // Add useEffect to set up window handlers
  useEffect(() => {
    // Initialize the handlers
    window.handleAcceptChange = (id: string) => {
      console.log("Looking for change with ID:", id);
      console.log("Current pending changes:", pendingChanges);
      const change = pendingChanges.find((c) => c.elementId === id);
      console.log("Found change:", change);
      if (change) {
        handleAcceptChange(change);
      } else {
        console.error("No change found with ID:", id);
      }
    };

    window.handleDeclineChange = (id: string) => {
      console.log("Looking for change with ID:", id);
      console.log("Current pending changes:", pendingChanges);
      const change = pendingChanges.find((c) => c.elementId === id);
      console.log("Found change:", change);
      if (change) {
        handleDeclineChange(change);
      } else {
        console.error("No change found with ID:", id);
      }
    };

    // Cleanup function
    return () => {
      window.handleAcceptChange = undefined;
      window.handleDeclineChange = undefined;
    };
  }, [pendingChanges, handleAcceptChange, handleDeclineChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const newMessage: Message = { role: "user", content: userInput };
    setMessages((prev) => [...prev, newMessage]);
    setUserInput("");
    setIsLoading(true);

    try {
      console.log("Sending request to API with content:", content);
      const response = await fetch("/api/content/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, newMessage],
          currentContent: content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process request");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const processedUpdates = new Set<string>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        console.log("Received chunk:", chunk);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(5).trim();
            if (dataStr === "[DONE]") {
              console.log("Received [DONE] message");
              continue;
            }

            try {
              const data = JSON.parse(dataStr);
              console.log("Parsed data:", data);

              if (data.type === "content") {
                const updateKey = `${data.update.type}-${data.update.target}-${data.update.content}`;
                if (processedUpdates.has(updateKey)) {
                  console.log("Skipping duplicate update");
                  continue;
                }
                processedUpdates.add(updateKey);

                const update: ContentUpdate = data.update;
                console.log("Processing content update:", update);

                // Create a temporary div to parse the HTML content
                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = update.content;

                // Generate a unique ID for this change
                const elementId = `change-${Date.now()}`;

                // Create the content nodes
                const contentNodes: JSONContent[] = [];
                Array.from(tempDiv.children).forEach((child) => {
                  if (child.tagName === "H2") {
                    contentNodes.push({
                      type: "heading",
                      attrs: { level: 2 },
                      content: [
                        { type: "text", text: child.textContent || "" },
                      ],
                    });
                  } else if (child.tagName === "P") {
                    contentNodes.push({
                      type: "paragraph",
                      content: [
                        { type: "text", text: child.textContent || "" },
                      ],
                    });
                  }
                });

                // Insert the highlighted content
                editor
                  ?.chain()
                  .focus()
                  .insertContent({
                    type: "highlightedContent",
                    attrs: { "data-change-id": elementId },
                    content: contentNodes,
                  })
                  .run();

                // Add to pending changes
                setPendingChanges((prev) => [
                  ...prev,
                  {
                    update,
                    content: editor?.getHTML() || "",
                    timestamp: Date.now(),
                    elementId,
                  },
                ]);
              } else if (data.type === "message") {
                setMessages((prev) => [
                  ...prev.filter((m) => m.role !== "assistant"),
                  { role: "assistant", content: data.content },
                ]);
              }
            } catch (error) {
              console.error("Failed to parse chunk:", error);
              console.error("Problematic line:", line);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the addDebugHighlight function
  const addDebugHighlight = () => {
    const elementId = `debug-${Date.now()}`;
    console.log("Creating debug highlight with ID:", elementId);

    // Create the highlighted content using TipTap commands
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: "highlightedContent",
        attrs: { "data-change-id": elementId },
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Debug Section" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "This is a test section to verify highlighting functionality. The content should be highlighted with a yellow background and have accept/decline buttons on hover.",
              },
            ],
          },
        ],
      })
      .run();

    // Add to pending changes
    const newChange: PendingChange = {
      update: {
        type: "insert" as const,
        position: "after" as const,
        content:
          "<h2>Debug Section</h2><p>This is a test section to verify highlighting functionality. The content should be highlighted with a yellow background and have accept/decline buttons on hover.</p>",
        explanation: "Debug highlight test",
      },
      content: editor?.getHTML() || "",
      timestamp: Date.now(),
      elementId,
    };

    console.log("Adding new change to pending changes:", newChange);
    setPendingChanges((prev) => [...prev, newChange]);
  };

  const handleImproveSelection = async () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    if (!selectedText) return;

    setUserInput(`Please improve this section: "${selectedText}"`);
    const formEvent = new Event(
      "submit"
    ) as unknown as React.FormEvent<HTMLFormElement>;
    handleSubmit(formEvent);
  };

  const handleExpandSelection = async () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    if (!selectedText) return;

    setUserInput(
      `Please expand this section with more details: "${selectedText}"`
    );
    const formEvent = new Event(
      "submit"
    ) as unknown as React.FormEvent<HTMLFormElement>;
    handleSubmit(formEvent);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Paper Canvas</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addDebugHighlight}
              className="flex items-center gap-2 bg-yellow-100 hover:bg-yellow-200"
            >
              Test Highlight
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>

        {showSettings && (
          <Card className="p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL (Optional)
                </label>
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter URL to crawl content"
                />
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-4">
          <div
            ref={containerRef}
            className="relative mx-auto"
            style={{ width: "100%" }}
          >
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
                    )}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={cn(
                      "h-8 w-8 p-0",
                      editor?.isActive("italic") && "bg-gray-100"
                    )}
                  >
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
                    )}
                  >
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
                    )}
                  >
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
                    )}
                  >
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
                    )}
                  >
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
                    )}
                  >
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
                    )}
                  >
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
                    )}
                  >
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
                    )}
                  >
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
                    )}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Add FloatingMenu component */}
              {editor && (
                <FloatingMenu
                  editor={editor}
                  onImprove={handleImproveSelection}
                  onExpand={handleExpandSelection}
                />
              )}

              {/* Editor Content */}
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="p-12">
                  <EditorContent
                    editor={editor}
                    className={cn(
                      "prose prose-lg max-w-none focus:outline-none",
                      "prose-headings:font-bold prose-headings:text-gray-900",
                      "prose-p:text-gray-700 prose-p:leading-relaxed",
                      "prose-mark:bg-yellow-200 prose-mark:rounded prose-mark:px-1",
                      "[&_.group]:bg-yellow-100 [&_.group]:p-4 [&_.group]:rounded-lg [&_.group]:border [&_.group]:border-yellow-200",
                      "[&_.group:hover_.hidden]:flex [&_.group:hover_.hidden]:gap-1 [&_.group:hover_.hidden]:bg-white [&_.group:hover_.hidden]:shadow-md [&_.group:hover_.hidden]:rounded-md [&_.group:hover_.hidden]:p-1 [&_.group:hover_.hidden]:z-50"
                    )}
                  />
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Chat Panel */}
          <div className="lg:sticky lg:top-4">
            <Card className="h-[calc(100vh-100px)] flex flex-col">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-lg">AI Assistant</h2>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === "assistant" ||
                        message.role === "status"
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <div
                        className={`rounded-lg p-4 max-w-[90%] ${
                          message.role === "status"
                            ? "bg-blue-50 text-blue-700"
                            : message.role === "assistant"
                            ? "bg-gray-100"
                            : "bg-blue-500 text-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {message.role === "status" && (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-1" />
                          )}
                          <div className="flex-1">
                            <div className="whitespace-pre-wrap text-sm">
                              {message.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask me to help with your content..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 px-4"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Thinking...
                      </>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
