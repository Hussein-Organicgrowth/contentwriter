"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import { IWebsite } from "@/models/Website";

interface FormData {
  keyword: string;
  title: string;
  language: string;
  targetCountry: string;
  contentType: string;
  relatedKeywords: string[];
  selectedWebsite: IWebsite;
  context: string;
}

interface OutlineItem {
  content: string;
  level: string;
  context?: string;
}

export default function GenerateContentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [currentSection, setCurrentSection] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [website, setWebsite] = useState<IWebsite | null>(null);

  useEffect(() => {
    const storedFormData = localStorage.getItem("contentFormData");
    const storedOutline = localStorage.getItem("outlineData");
    console.log("Initial localStorage check:", {
      storedFormData,
      storedOutline,
    });

    if (!storedFormData || !storedOutline) {
      console.log("Missing required data, redirecting...");
      router.push("/content/singlecontent");
      return;
    }

    try {
      const parsedFormData = JSON.parse(storedFormData);
      const parsedData = JSON.parse(storedOutline);
      console.log("Parsed data:", { parsedFormData, parsedData });
      setFormData(parsedFormData);
      setOutline(parsedData.outline);
    } catch (error) {
      console.error("Error parsing stored data:", error);
      router.push("/content/singlecontent");
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const fetchWebsiteAndGenerateContent = async () => {
      console.log("Checking conditions:", { formData, outline });
      if (!formData || !outline.length) {
        console.log("Missing formData or outline, skipping fetch");
        return;
      }

      const companyName = localStorage.getItem("company");
      console.log("Fetching for company:", companyName);

      if (!companyName) {
        toast.error("No company selected");
        router.push("/content/singlecontent");
        return;
      }

      try {
        console.log("Fetching website data...");
        const response = await fetch("/api/website");
        const data = await response.json();
        console.log("Website data received:", data);

        if (!isSubscribed) {
          console.log("Component unmounted, skipping updates");
          return;
        }

        if (data.websites) {
          const matchedWebsite = data.websites.find(
            (w: IWebsite) => w.name.toLowerCase() === companyName.toLowerCase()
          );

          if (matchedWebsite) {
            console.log("Found matching website:", matchedWebsite);
            setWebsite(matchedWebsite);

            if (isSubscribed) {
              console.log("Starting content generation...");
              await generateContent(formData, outline, matchedWebsite);
            }
          } else {
            console.log("No matching website found");
            toast.error(`No website found for company: ${companyName}`);
            router.push("/content/singlecontent");
          }
        }
      } catch (error) {
        console.error("Error fetching website:", error);
        if (isSubscribed) {
          toast.error("Failed to fetch website data");
        }
      }
    };

    fetchWebsiteAndGenerateContent();

    return () => {
      console.log("Cleaning up website fetch effect");
      isSubscribed = false;
    };
  }, [formData, outline]);

  useEffect(() => {
    // Update word count whenever content changes
    const words = streamedContent.trim().split(/\s+/).length;
    setWordCount(words);
  }, [streamedContent]);

  const generateContent = async (
    formData: FormData,
    outline: OutlineItem[],
    website: IWebsite
  ) => {
    console.log("Generate content called with:", {
      formData,
      outline,
      website,
    });
    setIsLoading(true);
    setStreamedContent("");
    setCurrentSection("");

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    try {
      console.log("Making API request to /api/content");
      const response = await fetch("/api/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyword: formData.keyword,
          title: formData.title,
          outline: outline,
          relatedKeywords: formData.relatedKeywords,
          language: formData.language,
          targetCountry: formData.targetCountry,
          context: formData.context,
          companyInfo: {
            name: website.name,
            website: website.website,
            description: website.description,
            summary: website.summary,
            toneofvoice: website.toneofvoice,
            targetAudience: website.targetAudience,
          },
        }),
      });

      console.log("API response status:", response.status);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error("Response body is null");

      const reader = response.body.getReader();
      console.log("Stream reader created");

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log("Stream complete");
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() === "") continue;

            if (line.startsWith("data: ")) {
              const data = line.slice(5);

              if (data === "[DONE]") {
                console.log("Received [DONE] signal");
                break;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.section && parsed.isProgress) {
                  setCurrentSection(parsed.section);
                }

                if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamedContent(fullContent);
                }
              } catch (e) {
                console.error("Error parsing JSON:", e, "Raw data:", data);
              }
            }
          }
        }
      } finally {
        console.log("Cleaning up reader");
        reader.releaseLock();
        setIsLoading(false);

        // Process any remaining buffer
        if (buffer) {
          try {
            if (buffer.startsWith("data: ")) {
              const data = buffer.slice(5);
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamedContent(fullContent);
              }
            }
          } catch (e) {
            console.error("Error processing final buffer:", e);
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate content"
      );
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/content/singlecontent/outline");
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(streamedContent);
      toast.success("Content copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy content");
    }
  };

  const handleExportHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${formData?.title || "Generated Content"}</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #333;
        }
        h1 { font-size: 2.5rem; margin-bottom: 1.5rem; }
        h2 { font-size: 2rem; margin-top: 2rem; margin-bottom: 1rem; }
        h3 { font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        p { margin-bottom: 1rem; }
        ul, ol { margin-bottom: 1rem; padding-left: 2rem; }
        li { margin-bottom: 0.5rem; }
    </style>
</head>
<body>
    ${streamedContent}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formData?.title || "generated-content"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Content exported as HTML!");
  };

  const handleSaveContent = async () => {
    if (!streamedContent || !formData) {
      toast.error("No content to save");
      return;
    }

    try {
      const contentData = {
        title: formData.title,
        html: streamedContent,
        status: "Draft",
        contentType: formData.contentType,
        mainKeyword: formData.keyword,
        relatedKeywords: formData.relatedKeywords,
        websiteId: website?._id,
      };

      const response = await fetch("/api/content/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contentData),
      });

      if (!response.ok) {
        throw new Error("Failed to save content");
      }

      toast.success("Content saved successfully!");
      router.push("/dashboard/viewcontent");
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
    }
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
              Generated Content
            </CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">
              {wordCount} words written
            </div>
            {streamedContent && !isLoading && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyContent}
                  className="flex items-center gap-1"
                >
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportHTML}
                  className="flex items-center gap-1"
                >
                  Export
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveContent}
                  className="flex items-center gap-1"
                >
                  Save Content
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-4" />
                <p className="text-gray-500 mb-2">
                  {currentSection
                    ? `Generating ${currentSection}...`
                    : "Preparing content..."}
                </p>
                {wordCount > 0 && (
                  <p className="text-sm text-gray-500">
                    {wordCount} words generated
                  </p>
                )}
              </div>
              {streamedContent && (
                <div className="prose prose-lg max-w-none">
                  <div
                    dangerouslySetInnerHTML={{ __html: streamedContent }}
                    className="space-y-4"
                  />
                </div>
              )}
            </div>
          ) : streamedContent ? (
            <div className="prose prose-lg max-w-none">
              <div
                dangerouslySetInnerHTML={{ __html: streamedContent }}
                className="space-y-4"
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No content generated yet. Please wait...
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
