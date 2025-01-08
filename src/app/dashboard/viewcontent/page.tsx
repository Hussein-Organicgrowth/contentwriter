"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkUploading, setIsBulkUploading] = useState(false);

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
        const website =
          data.websites.find(
            (w: any) => w.name.toLowerCase() === companyName.toLowerCase()
          ) ||
          data.sharedWebsites?.find(
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

  const handleBulkWebhookUpload = async () => {
    const selectedContent = items.filter((item) => selectedItems.has(item._id));
    if (selectedContent.length === 0) {
      toast.error("Please select content to upload");
      return;
    }

    const webhookUrl = localStorage.getItem("webhookUrl");
    if (!webhookUrl) {
      toast.error("Please configure webhook URL in settings");
      return;
    }

    setIsBulkUploading(true);
    let successCount = 0;
    let failureCount = 0;

    for (const content of selectedContent) {
      try {
        const response = await fetch("/api/content/webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhookUrl,
            content: {
              title: content.title,
              content: content.html,
              status: content.status.toLowerCase(),
              keywords: {
                main: content.mainKeyword,
                related: content.relatedKeywords,
              },
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send ${content.title} to webhook`);
        }
        successCount++;
        toast.success(`Sent "${content.title}" to webhook`);
      } catch (error) {
        console.error(`Error sending ${content.title} to webhook:`, error);
        failureCount++;
        toast.error(`Failed to send "${content.title}" to webhook`);
      }
    }

    setIsBulkUploading(false);
    setSelectedItems(new Set());
    toast.success(
      `Completed: ${successCount} succeeded, ${failureCount} failed`
    );
  };

  const toggleItemSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === sortedContent.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedContent.map((item) => item._id)));
    }
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
          <div className="flex gap-2">
            {selectedItems.size > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkWebhookUpload}
                disabled={isBulkUploading}
              >
                {isBulkUploading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                    Uploading...
                  </>
                ) : (
                  <>Send Selected to Webhook ({selectedItems.size})</>
                )}
              </Button>
            )}
            <Button
              className="gap-2"
              onClick={handleGenerateNew}
              variant="secondary"
            >
              <Plus className="h-4 w-4" /> Generate New Content
            </Button>
          </div>
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
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedItems.size === sortedContent.length &&
                            sortedContent.length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Words</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead
                        onClick={toggleSort}
                        className="cursor-pointer"
                      >
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
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.has(item._id)}
                            onCheckedChange={() =>
                              toggleItemSelection(item._id)
                            }
                            aria-label={`Select ${item.title}`}
                          />
                        </TableCell>
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
                                }`}
                              >
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
                                  ) => updateStatus(item._id, value)}
                                >
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
                            onClick={() => handleViewContent(item._id)}
                          >
                            View
                          </Button>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Upload
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Upload Content</DialogTitle>
                                <DialogDescription>
                                  Send your content to the configured webhook
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    const newSet = new Set([item._id]);
                                    setSelectedItems(newSet);
                                    handleBulkWebhookUpload();
                                  }}
                                  className="w-full justify-start"
                                >
                                  <Image
                                    src="https://www.google.com/s2/favicons?domain=acme.com&sz=64"
                                    alt="Webhook"
                                    width={16} // Adjust width as needed
                                    height={16} // Adjust height as needed
                                    className="mr-2 h-4 w-4"
                                  />
                                  Send to Webhook
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedContent(item);
                              setShowDeleteDialog(true);
                            }}
                          >
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
              {selectedContent?.title}&quot; and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedContent(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
