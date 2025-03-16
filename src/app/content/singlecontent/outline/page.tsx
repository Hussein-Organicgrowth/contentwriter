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
  Edit2,
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
import { Label } from "@/components/ui/label";

interface OutlineItem {
  id: string;
  content: string;
  level: "h2" | "h3" | "h4";
  context?: string;
}

interface FormData {
  keyword: string;
  title: string;
  language: string;
  targetCountry: string;
  contentType: string;
  relatedKeywords: string[];
  selectedWebsite: {
    _id: string;
    name: string;
    toneofvoice: string;
  };
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
      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group"
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
        <div className="flex-1">
          <span
            className={`block ${
              item.level === "h2"
                ? "font-semibold text-lg"
                : item.level === "h3"
                ? "font-medium text-base"
                : "text-base"
            }`}
          >
            {item.content}
          </span>
          {item.context && (
            <span className="text-sm text-gray-500 mt-1 block">
              Context: {item.context}
            </span>
          )}
        </div>
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

export default function OutlinePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingContext, setEditingContext] = useState("");
  const [editingLevel, setEditingLevel] = useState<"h2" | "h3" | "h4">("h2");
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
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

            return {
              id: crypto.randomUUID(),
              content,
              level,
            };
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
        if (outline.length === 0) {
          await generateOutline(parsedData);
        }
      } catch (error) {
        console.error("Error parsing stored data:", error);
        router.push("/content/singlecontent");
      }
    };

    initializeData();
  }, [router]);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(outline[index].content);
    setEditingContext(outline[index].context || "");
    setEditingLevel(outline[index].level);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      const newOutline = [...outline];
      newOutline[editingIndex] = {
        ...newOutline[editingIndex],
        content: editingText,
        context: editingContext || undefined,
        level: editingLevel,
      };
      setOutline(newOutline);
      setEditingIndex(null);
      setEditingText("");
      setEditingContext("");
    }
  };

  const handleDelete = (index: number) => {
    const newOutline = outline.filter((_, i) => i !== index);
    setOutline(newOutline);
  };

  const handleAddSection = () => {
    const newItem = {
      id: crypto.randomUUID(),
      content: "New Section",
      level: "h2" as const,
    };
    setOutline([...outline, newItem]);
    handleEdit(outline.length);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOutline((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleBulkLevelChange = (level: "h2" | "h3" | "h4") => {
    setOutline((items) =>
      items.map((item) => ({
        ...item,
        level,
      }))
    );
  };

  const handleBack = () => {
    router.push("/content/singlecontent");
  };

  const handleContinue = () => {
    if (!formData) return;

    localStorage.setItem(
      "outlineData",
      JSON.stringify({
        ...formData,
        outline: outline.map((item) => ({
          content: item.content,
          level: item.level,
          context: item.context,
        })),
      })
    );

    router.push("/content/singlecontent/generate");
  };

  const handleBulkAdd = () => {
    const newSections = bulkHeaders
      .split("\n")
      .filter((line) => line.trim())
      .map((header) => ({
        id: crypto.randomUUID(),
        content: header.trim(),
        level: bulkHeaderLevel,
        context: "",
      }));

    setOutline([...outline, ...newSections]);
    setBulkHeaders("");
    setShowBulkAddDialog(false);
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={outline}
                    strategy={verticalListSortingStrategy}
                  >
                    {outline.map((item, index) =>
                      editingIndex === index ? (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1 flex gap-2">
                            <Select
                              value={editingLevel}
                              onValueChange={(value: "h2" | "h3" | "h4") =>
                                setEditingLevel(value)
                              }
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
                          onEdit={() => handleEdit(index)}
                          onDelete={() => handleDelete(index)}
                        />
                      )
                    )}
                  </SortableContext>
                </DndContext>
              </div>

              <div className="flex justify-between items-center pt-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleAddSection}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Section
                  </Button>
                  <Dialog
                    open={showBulkAddDialog}
                    onOpenChange={setShowBulkAddDialog}
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
                            onValueChange={(value: "h2" | "h3" | "h4") =>
                              setBulkHeaderLevel(value)
                            }
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
                            onChange={(e) => setBulkHeaders(e.target.value)}
                            className="min-h-[200px]"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowBulkAddDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleBulkAdd} variant="secondary">
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
                        onClick={() => handleBulkLevelChange("h2")}
                      >
                        Set All to H2
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBulkLevelChange("h3")}
                      >
                        Set All to H3
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBulkLevelChange("h4")}
                      >
                        Set All to H4
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => generateOutline(formData!)}
                  >
                    Regenerate Outline
                  </Button>
                  <Button
                    onClick={handleContinue}
                    variant="secondary"
                    disabled={outline.length === 0}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {editingIndex !== null && (
        <Dialog
          open={editingIndex !== null}
          onOpenChange={() => setEditingIndex(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Heading Level</Label>
                <Select
                  value={editingLevel}
                  onValueChange={(value: "h2" | "h3" | "h4") =>
                    setEditingLevel(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h2">H2 - Main Section</SelectItem>
                    <SelectItem value="h3">H3 - Subsection</SelectItem>
                    <SelectItem value="h4">H4 - Sub-subsection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section Title</Label>
                <Input
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  placeholder="Enter section title"
                />
              </div>
              <div className="space-y-2">
                <Label>Context (Optional)</Label>
                <Textarea
                  value={editingContext}
                  onChange={(e) => setEditingContext(e.target.value)}
                  placeholder="Add specific instructions or context for this section"
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingIndex(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} variant="secondary">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
