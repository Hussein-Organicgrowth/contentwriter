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
  Edit2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ListPlus,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { IWebsite as Website } from "@/models/Website";

interface OutlineItem {
  id: string;
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

function SortableOutlineItem({
  item,
  onEdit,
  onDelete,
}: {
  item: OutlineItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-3 bg-white rounded-lg group"
    >
      <button className="cursor-grab touch-none" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-gray-400" />
      </button>
      <span
        className={`font-mono text-blue-600 font-semibold min-w-[2.5rem] ${
          item.level === "h3" ? "ml-4" : item.level === "h4" ? "ml-8" : ""
        }`}
      >
        {item.level.toUpperCase()}
      </span>
      <div className="flex-1 flex justify-between items-start">
        <span
          className={`flex-1 ${
            item.level === "h2"
              ? "font-semibold text-lg"
              : item.level === "h3"
              ? "font-medium text-base"
              : "text-base"
          }`}
        >
          {item.content}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
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
  const [showBulkAddDialog, setShowBulkAddDialog] = useState<string | null>(
    null
  );
  const [bulkHeaders, setBulkHeaders] = useState("");
  const [bulkHeaderLevel, setBulkHeaderLevel] = useState<"h2" | "h3" | "h4">(
    "h2"
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

              return {
                id: crypto.randomUUID(),
                content,
                level,
              };
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
              ...newOutline[editingIndex.outlineIndex],
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
            {
              id: crypto.randomUUID(),
              content: "New Section",
              level: "h2" as const,
            },
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

  const handleDragEnd = (event: DragEndEvent, entryId: string) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEntries((prevEntries) =>
        prevEntries.map((entry) => {
          if (entry.id === entryId) {
            const oldIndex = entry.outline.findIndex(
              (item) => item.id === active.id
            );
            const newIndex = entry.outline.findIndex(
              (item) => item.id === over.id
            );

            return {
              ...entry,
              outline: arrayMove(entry.outline, oldIndex, newIndex),
            };
          }
          return entry;
        })
      );
    }
  };

  const handleBulkLevelChange = (
    entryId: string,
    level: "h2" | "h3" | "h4"
  ) => {
    setEntries((prevEntries) =>
      prevEntries.map((entry) => {
        if (entry.id === entryId) {
          return {
            ...entry,
            outline: entry.outline.map((item) => ({
              ...item,
              level,
            })),
          };
        }
        return entry;
      })
    );
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

    localStorage.setItem(
      "bulkContentOutlines",
      JSON.stringify({
        ...bulkData,
        entries,
      })
    );

    router.push("/content/bulkcontent/generate");
  };

  const handleBulkAdd = (entryId: string) => {
    const headers = bulkHeaders
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");

    const newItems = headers.map((header) => ({
      id: crypto.randomUUID(),
      content: header,
      level: bulkHeaderLevel,
    }));

    setEntries((prevEntries) =>
      prevEntries.map((entry) => {
        if (entry.id === entryId) {
          return {
            ...entry,
            outline: [...entry.outline, ...newItems],
          };
        }
        return entry;
      })
    );

    setShowBulkAddDialog(null);
    setBulkHeaders("");
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
                        onClick={() => toggleExpand(entry.id)}
                      >
                        {entry.isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {entry.isExpanded && (
                      <div className="space-y-4">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleDragEnd(event, entry.id)}
                        >
                          <SortableContext
                            items={entry.outline}
                            strategy={verticalListSortingStrategy}
                          >
                            {entry.outline.map((item, index) =>
                              editingIndex?.entryId === entry.id &&
                              editingIndex.outlineIndex === index ? (
                                <div
                                  key={item.id}
                                  className="flex items-start gap-3 p-3 bg-white rounded-lg"
                                >
                                  <div className="flex-1 flex gap-2">
                                    <Select
                                      value={editingLevel}
                                      onValueChange={(
                                        value: "h2" | "h3" | "h4"
                                      ) => setEditingLevel(value)}
                                    >
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
                                      onClick={handleSaveEdit}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <SortableOutlineItem
                                  key={item.id}
                                  item={item}
                                  onEdit={() => handleEdit(entry.id, index)}
                                  onDelete={() => handleDelete(entry.id, index)}
                                />
                              )
                            )}
                          </SortableContext>
                        </DndContext>

                        <div className="flex justify-between items-center pt-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleAddSection(entry.id)}
                              className="flex items-center gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add Section
                            </Button>
                            <Dialog
                              open={showBulkAddDialog === entry.id}
                              onOpenChange={(open) =>
                                setShowBulkAddDialog(open ? entry.id : null)
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="flex items-center gap-2"
                                >
                                  <ListPlus className="h-4 w-4" />
                                  Bulk Add Headers
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Bulk Add Headers</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Select
                                      value={bulkHeaderLevel}
                                      onValueChange={(
                                        value: "h2" | "h3" | "h4"
                                      ) => setBulkHeaderLevel(value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select header level" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="h2">H2</SelectItem>
                                        <SelectItem value="h3">H3</SelectItem>
                                        <SelectItem value="h4">H4</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Textarea
                                      placeholder="Paste your headers here, one per line"
                                      value={bulkHeaders}
                                      onChange={(e) =>
                                        setBulkHeaders(e.target.value)
                                      }
                                      className="min-h-[200px]"
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowBulkAddDialog(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={() => handleBulkAdd(entry.id)}
                                  >
                                    Add Headers
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline">Bulk Actions</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleBulkLevelChange(entry.id, "h2")
                                  }
                                >
                                  Set All to H2
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleBulkLevelChange(entry.id, "h3")
                                  }
                                >
                                  Set All to H3
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleBulkLevelChange(entry.id, "h4")
                                  }
                                >
                                  Set All to H4
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleRegenerateOutline(entry.id)}
                          >
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
                  disabled={entries.some((e) => e.outline.length === 0)}
                >
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
