"use client";

import { useState, useEffect } from "react";
import { LANGUAGES, COUNTRIES } from "@/lib/localization";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { IWebsite as Website } from "@/models/Website";

const CONTENT_TYPES = [
  {
    value: "article",
    label: "Article",
    description: "In-depth, informative content with multiple sections",
  },
  {
    value: "blog",
    label: "Blog Post",
    description: "Engaging, conversational content with personal insights",
  },
  {
    value: "landing_page",
    label: "Landing Page",
    description: "Persuasive content focused on conversion",
  },
  {
    value: "service_page",
    label: "Service Page",
    description: "Detailed information about a specific service",
  },
  {
    value: "category_page",
    label: "Category Page",
    description: "Overview content for product/service categories",
  },
];

export default function SingleContent() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [title, setTitle] = useState("");
  const [relatedKeywords, setRelatedKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [language, setLanguage] = useState("da");
  const [targetCountry, setTargetCountry] = useState("DK");
  const [contentType, setContentType] = useState("article");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [includeBusinessName, setIncludeBusinessName] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchWebsites = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch("/api/website");
        const data = await response.json();

        if (data.websites) {
          // Check if we have a company ID in localStorage
          const companyId = localStorage.getItem("companyId");
          const companyName = localStorage.getItem("company");

          if (!companyId || !companyName) {
            setErrorMessage(
              "Please select a company from the dashboard first."
            );
            setCanGenerate(false);
            return;
          }

          // Find the website that matches the company ID
          const matchedWebsite = data.websites.find(
            (w: Website) => w._id?.toString() === companyId
          );

          if (matchedWebsite) {
            setSelectedWebsite(matchedWebsite);

            // Check if this is a shared website or owned website
            const isSharedWebsite =
              matchedWebsite.userId !== undefined &&
              typeof window !== "undefined" &&
              localStorage.getItem("userId") !== matchedWebsite.userId;

            if (isSharedWebsite) {
              setErrorMessage(
                "You can only generate content for websites you own."
              );
              setCanGenerate(false);
            } else {
              setCanGenerate(true);
            }
          } else {
            setErrorMessage(`No website found for company: ${companyName}`);
            setCanGenerate(false);
          }
        } else {
          setErrorMessage("No websites found. Please create a company first.");
          setCanGenerate(false);
        }
      } catch (error) {
        console.error("Error fetching websites:", error);
        setErrorMessage("Failed to fetch websites. Please try again later.");
        setCanGenerate(false);
      }

      setIsLoading(false);
    };

    fetchWebsites();
  }, []);

  const handleGenerateTitle = async () => {
    if (!keyword || !canGenerate) return;
    setIsGeneratingTitle(true);
    try {
      const response = await fetch("/api/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          language,
          targetCountry,
          contentType,
          businessName: includeBusinessName ? selectedWebsite?.name : undefined,
        }),
      });
      const data = await response.json();
      if (data.title) {
        setTitle(data.title);
      } else {
        toast.error("Failed to generate title. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while generating the title.");
    }
    setIsGeneratingTitle(false);
  };

  const handleGenerateKeywords = async () => {
    if (!keyword || !canGenerate) return;
    setIsGeneratingKeywords(true);
    try {
      const response = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, title }),
      });
      const data = await response.json();
      if (data.keywords) {
        setRelatedKeywords(data.keywords);
      } else {
        toast.error("Failed to generate keywords. Please try again.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while generating keywords.");
    }
    setIsGeneratingKeywords(false);
  };

  const removeKeyword = (indexToRemove: number) => {
    setRelatedKeywords((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canGenerate) {
      toast.error("You cannot generate content at this time.");
      return;
    }

    const formData = {
      keyword,
      title,
      language,
      targetCountry,
      contentType,
      relatedKeywords,
      selectedWebsite,
    };

    // Store the form data in localStorage for the outline page
    localStorage.setItem("contentFormData", JSON.stringify(formData));

    // Navigate to the outline page
    router.push("/content/singlecontent/outline");
  };

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto bg-[#f8f9fa]">
      <Card className="bg-white border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Content Details
          </CardTitle>
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading websites...</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {errorMessage && (
            <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-md flex items-start gap-3 text-red-700">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Unable to generate content</p>
                <p className="text-sm mt-1">{errorMessage}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-sm"
                  onClick={() => router.push("/dashboard")}
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}

          {selectedWebsite && (
            <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-md">
              <p className="text-blue-700 font-medium">
                Creating content for:{" "}
                <span className="font-bold">{selectedWebsite.name}</span>
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {selectedWebsite.website}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Main Keyword */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-bold">Main Keyword</Label>
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Enter your main keyword or topic..."
                  className="bg-white"
                  required
                  disabled={!canGenerate}
                />
              </div>

              {/* Content Type */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-bold">Content Type</Label>
                <Select
                  value={contentType}
                  onValueChange={setContentType}
                  disabled={!canGenerate}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {contentType && (
                  <p className="text-sm text-gray-500">
                    {
                      CONTENT_TYPES.find((t) => t.value === contentType)
                        ?.description
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-gray-700 font-bold">Language</Label>
                <Select
                  value={language}
                  onValueChange={setLanguage}
                  disabled={!canGenerate}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-bold">
                  Target Country
                </Label>
                <Select
                  value={targetCountry}
                  onValueChange={setTargetCountry}
                  disabled={!canGenerate}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title Section */}
            <Card className="border bg-gray-50">
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-bold">
                    Title{" "}
                    {title && (
                      <span className="text-blue-600">(AI Generated)</span>
                    )}
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeBusinessName"
                        checked={includeBusinessName}
                        onCheckedChange={(checked) =>
                          setIncludeBusinessName(checked as boolean)
                        }
                        disabled={!canGenerate}
                      />
                      <label
                        htmlFor="includeBusinessName"
                        className={`text-sm ${
                          !canGenerate ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Include business name in title
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter title or generate one..."
                      className="bg-white"
                      required
                      disabled={!canGenerate}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleGenerateTitle}
                      disabled={
                        !keyword ||
                        isGeneratingTitle ||
                        (includeBusinessName && !selectedWebsite) ||
                        !canGenerate
                      }
                    >
                      {isGeneratingTitle ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Generate"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Related Keywords Section */}
            <Card className="border bg-gray-50">
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-700 font-bold">
                      Related Keywords (Optional)
                    </Label>
                    {relatedKeywords.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRelatedKeywords([])}
                        className="text-red-500 hover:text-red-700"
                        disabled={!canGenerate}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleGenerateKeywords}
                      disabled={
                        !keyword || isGeneratingKeywords || !canGenerate
                      }
                    >
                      {isGeneratingKeywords ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Generate Keywords
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {relatedKeywords.map((kw, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {kw}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:text-red-500"
                          onClick={() => removeKeyword(index)}
                          disabled={!canGenerate}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Add a custom keyword"
                      className="bg-white"
                      disabled={!canGenerate}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && canGenerate) {
                          e.preventDefault();
                          if (newKeyword.trim()) {
                            setRelatedKeywords((prev) => [
                              ...prev,
                              newKeyword.trim(),
                            ]);
                            setNewKeyword("");
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (newKeyword.trim()) {
                          setRelatedKeywords((prev) => [
                            ...prev,
                            newKeyword.trim(),
                          ]);
                          setNewKeyword("");
                        }
                      }}
                      disabled={!newKeyword.trim() || !canGenerate}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              size="lg"
              disabled={!keyword || !title || !canGenerate}
            >
              {!canGenerate ? "Cannot Generate Content" : "Generate Content"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
