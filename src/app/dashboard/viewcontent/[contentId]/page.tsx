"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TextEditor from "@/app/dashboard/texteditor/page";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
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

interface PageParams {
  params: { contentId: string };
}

export default function ViewContentPage({ params }: PageParams) {
  const router = useRouter();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const contentId = params.contentId;

  console.log("contentId", contentId);

  useEffect(() => {
    fetchContent();
  }, [contentId]);

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
          const contentItem = website.content.find(
            (c: Content) => c._id === contentId
          );
          if (contentItem) {
            setContent(contentItem);
          } else {
            toast.error("Content not found");
            router.push("/dashboard/viewcontent");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching content:", error);
      toast.error("Failed to fetch content");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/dashboard/viewcontent");
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/content/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete content");
      }

      toast.success("Content deleted successfully");
      router.push("/dashboard/viewcontent");
    } catch (error) {
      console.error("Error deleting content:", error);
      toast.error("Failed to delete content");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600 mb-4">Content not found</p>
        <Button onClick={handleBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{content?.title}</h1>
            <p className="text-sm text-gray-500">
              {content?.contentType} • {content?.status} • Created on{" "}
              {new Date(content?.date || "").toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete Content
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <TextEditor
          initialContent={content?.html || ""}
          contentId={content?._id || ""}
        />
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              content and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
