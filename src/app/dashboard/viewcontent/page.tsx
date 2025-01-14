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
import {
  Search,
  ArrowUpDown,
  Plus,
  Trash2,
  Folder,
  FolderPlus,
  X,
} from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Content {
  _id: string;
  title: string;
  html: string;
  date: string;
  status: "Published" | "Draft";
  contentType: string;
  mainKeyword: string;
  relatedKeywords: string[];
  folderId?: string | null;
}

interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

interface Website {
  _id: string;
  name: string;
  content: Content[];
  folders: Folder[];
  toneofvoice: string;
  userId: string;
  sharedWith: string[];
}

export default function ViewContent() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [items, setItems] = useState<Content[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
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

      console.log("API Response:", data);

      if (!data.websites && !data.sharedWebsites) {
        console.log("No websites found");
        return;
      }

      // Find the website in either owned or shared websites
      const website =
        data.websites?.find(
          (w: Website) => w.name.toLowerCase() === companyName.toLowerCase()
        ) ||
        data.sharedWebsites?.find(
          (w: Website) => w.name.toLowerCase() === companyName.toLowerCase()
        );

      if (!website) {
        console.log("Website not found:", companyName);
        toast.error("Website not found");
        return;
      }

      console.log("Found website:", website.name);
      console.log("Website content:", website.content);
      setItems(website.content || []);
      setFolders(website.folders || []);
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

  const handleGenerateNew = () => {
    router.push("/content/singlecontent");
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const companyName = localStorage.getItem("company");
    if (!companyName) {
      toast.error("No company selected");
      return;
    }

    try {
      const response = await fetch("/api/website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createFolder",
          websiteName: companyName,
          folderName: newFolderName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create folder");
      }

      const { website } = await response.json();
      setFolders(website.folders || []);
      setNewFolderName("");
      setShowFolderDialog(false);
      toast.success("Folder created successfully");
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder");
    }
  };

  // Filter content based on search query and selected folder
  const filteredContent = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedFolder === null || item.folderId === selectedFolder)
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
    console.log("contentId", contentId);
    router.push(`/dashboard/viewcontent/${contentId}`);
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

  const handleDeleteFolder = async (folderId: string) => {
    const companyName = localStorage.getItem("company");
    if (!companyName) {
      toast.error("No company selected");
      return;
    }

    try {
      const response = await fetch("/api/website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "deleteFolder",
          websiteName: companyName,
          folderId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete folder");
      }

      const { website } = await response.json();
      setItems(website.content || []);
      setFolders(website.folders || []);

      // If we're currently viewing the deleted folder, switch to "All Content"
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
      }

      toast.success("Folder deleted successfully");
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("Failed to delete folder");
    }
  };

  const handleBulkMoveToFolder = async (folderId: string | null) => {
    const companyName = localStorage.getItem("company");
    if (!companyName) {
      toast.error("No company selected");
      return;
    }

    try {
      const response = await fetch("/api/website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "moveContent",
          websiteName: companyName,
          folderId,
          content: Array.from(selectedItems),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to move content");
      }

      const { website } = await response.json();
      setItems(website.content || []);
      setSelectedItems(new Set());
      toast.success(
        `Moved ${selectedItems.size} items to ${
          folderId
            ? folders.find((f) => f.id === folderId)?.name
            : "All Content"
        }`
      );
    } catch (error) {
      console.error("Error moving content:", error);
      toast.error("Failed to move content");
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
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Folder className="h-4 w-4 mr-2" />
                      Move {selectedItems.size} Items
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleBulkMoveToFolder(null)}
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      Move to All Content
                    </DropdownMenuItem>
                    {folders.map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() => handleBulkMoveToFolder(folder.id)}
                      >
                        <Folder className="h-4 w-4 mr-2" />
                        Move to {folder.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

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
              </>
            )}
            <Button variant="outline" onClick={() => setShowFolderDialog(true)}>
              <FolderPlus className="h-4 w-4 mr-2" /> New Folder
            </Button>
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
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Content Library</CardTitle>
                <CardDescription>
                  A list of all your generated content across different types
                </CardDescription>
              </div>
              <div className="relative w-72">
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
            <Tabs
              defaultValue={selectedFolder ?? "all"}
              onValueChange={(value) =>
                setSelectedFolder(value === "all" ? null : value)
              }
            >
              <TabsList className="mb-4 w-full flex flex-wrap gap-1 p-2">
                <TabsTrigger
                  value="all"
                  className="flex items-center gap-2 data-[state=active]:bg-primary/10 hover:bg-muted"
                >
                  <Folder className="h-4 w-4" />
                  All Content
                </TabsTrigger>
                {folders.map((folder) => (
                  <TabsTrigger
                    key={folder.id}
                    value={folder.id}
                    className="group flex items-center gap-2 data-[state=active]:bg-primary/10 hover:bg-muted"
                  >
                    <Folder className="h-4 w-4" />
                    {folder.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id);
                      }}
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                    </Button>
                  </TabsTrigger>
                ))}
              </TabsList>

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
                      <TableHead>Folder</TableHead>
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
                              <div
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors hover:cursor-pointer hover:opacity-80 ${
                                  item.status === "Published"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {item.status}
                              </div>
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
                          {item.folderId ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Folder className="h-4 w-4" />
                              {
                                folders.find((f) => f.id === item.folderId)
                                  ?.name
                              }
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              All Content
                            </span>
                          )}
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
                                    width={16}
                                    height={16}
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
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Folder Name</Label>
              <Input
                id="name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFolderDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleCreateFolder}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete &quot;
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
