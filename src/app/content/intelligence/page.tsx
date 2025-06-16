"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  Search,
  FileText,
  BarChart2,
  Link2,
  Lightbulb,
  FileBarChart2,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// API Stats interface
interface ProcessingStats {
  discoveredUrlCount: number;
  returnedUrlCount: number;
  capped: boolean;
}

// Initial empty state
const emptyUrls: string[] = [];

export default function ContentIntelligencePage() {
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [allUrls, setAllUrls] = useState<string[]>(emptyUrls); // Stores all URLs from API
  const [isLoading, setIsLoading] = useState(false); // General loading for sitemap indexing
  const [apiError, setApiError] = useState<string | null>(null);
  const [indexingCompleted, setIndexingCompleted] = useState(false); // Tracks if an indexing operation was completed
  const [processingStats, setProcessingStats] =
    useState<ProcessingStats | null>(null);

  // State for Key URL Selection by AI
  const [keyUrls, setKeyUrls] = useState<string[]>(emptyUrls);
  const [isSelectingKeyUrls, setIsSelectingKeyUrls] = useState(false);
  const [keyUrlSelectionError, setKeyUrlSelectionError] = useState<
    string | null
  >(null);

  // State for Business Analysis from Key URLs
  const [businessAnalysis, setBusinessAnalysis] = useState<string | null>(null); // Can be string or a more structured object later
  const [isAnalyzingBusiness, setIsAnalyzingBusiness] = useState(false);
  const [businessAnalysisError, setBusinessAnalysisError] = useState<
    string | null
  >(null);
  const [businessAnalysisCompleted, setBusinessAnalysisCompleted] =
    useState(false);

  // State for Content Structure & Style Analysis
  const [contentStructureAnalysis, setContentStructureAnalysis] = useState<
    string | null
  >(null);
  const [isAnalyzingContentStructure, setIsAnalyzingContentStructure] =
    useState(false);
  const [contentStructureAnalysisError, setContentStructureAnalysisError] =
    useState<string | null>(null);
  const [
    contentStructureAnalysisCompleted,
    setContentStructureAnalysisCompleted,
  ] = useState(false);

  // New: Track if all analysis steps are running
  const [isRunningFullAnalysis, setIsRunningFullAnalysis] = useState(false);

  // Effect to load URLs from DB on component mount or when companyId is available
  useEffect(() => {
    const fetchInitialUrls = async () => {
      const companyIdFromStorage = localStorage.getItem("companyId");
      if (!companyIdFromStorage) {
        console.log("No companyId in localStorage, skipping initial URL load.");
        setIsRunningFullAnalysis(false);
        return;
      }

      console.log(
        `Fetching initial URLs for websiteId: ${companyIdFromStorage}`
      );
      setIsLoading(true);
      setApiError(null);

      try {
        const response = await fetch(
          `/api/get-sitemap-urls?websiteId=${companyIdFromStorage}`
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Failed to fetch saved URLs: ${response.status} ${
              errorData.details || response.statusText
            }`
          );
        }
        const data = await response.json();
        if (data && Array.isArray(data.urls) && data.urls.length > 0) {
          setAllUrls(data.urls);
          if (data.stats && typeof data.stats === "object") {
            setProcessingStats(data.stats as ProcessingStats);
          }
          if (Array.isArray(data.keyUrls)) {
            setKeyUrls(data.keyUrls);
          }
          if (
            typeof data.businessAnalysis === "string" &&
            data.businessAnalysis
          ) {
            setBusinessAnalysis(data.businessAnalysis);
            setBusinessAnalysisCompleted(true);
          }
          if (
            typeof data.contentStructureAnalysis === "string" &&
            data.contentStructureAnalysis
          ) {
            setContentStructureAnalysis(data.contentStructureAnalysis);
            setContentStructureAnalysisCompleted(true);
          }
          console.log("Successfully loaded saved URLs from DB.");
          setIndexingCompleted(true); // Indicate that data is available (as if indexed)
        } else {
          console.log(
            "No saved URLs found in DB for this websiteId or response was empty."
          );
          setAllUrls([]); // Ensure it's an empty array if nothing loaded
          setProcessingStats(null);
        }
      } catch (error: unknown) {
        console.error("Error fetching initial URLs:", error);
        setApiError(
          error instanceof Error
            ? error.message
            : "Could not load saved sitemap URLs."
        );
        setAllUrls([]); // Safety reset
        setProcessingStats(null);
      } finally {
        setIsLoading(false);
        setIsRunningFullAnalysis(false);
      }
    };

    fetchInitialUrls();
  }, []); // Runs once on mount. If companyId can change and you need to re-fetch, add it to dependency array.

  // Helper: Run all analysis steps in sequence
  const runFullAnalysis = async () => {
    setIsRunningFullAnalysis(true);
    setKeyUrlSelectionError(null);
    setBusinessAnalysisError(null);
    setContentStructureAnalysisError(null);
    setKeyUrls([]);
    setBusinessAnalysis(null);
    setBusinessAnalysisCompleted(false);
    setContentStructureAnalysis(null);
    setContentStructureAnalysisCompleted(false);

    // 1. Select Key URLs
    setIsSelectingKeyUrls(true);
    let selectedKeyUrls: string[] = [];

    let isBusinessAnalysisCompleted = false;
    let isContentStructureAnalysisCompleted = false;
    let businessAnalysis = "";
    let contentStructureAnalysis = "";
    try {
      const companyIdFromStorage = localStorage.getItem("companyId");
      if (!companyIdFromStorage)
        throw new Error(
          "Website ID (companyId) not found. Cannot proceed with analysis."
        );
      const response = await fetch("/api/ai/select-key-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: allUrls,
          websiteId: companyIdFromStorage,
          model: "gpt-4.1-mini-2025-04-14",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to select key URLs: ${response.status} ${
            response.statusText
          } - ${
            errorData.error ||
            errorData.details ||
            "No additional error details provided."
          }`
        );
      }
      const data = await response.json();
      if (data && Array.isArray(data.keyUrls)) {
        setKeyUrls(data.keyUrls);
        selectedKeyUrls = data.keyUrls;
      } else {
        throw new Error(
          "Received an unexpected response from the selection service."
        );
      }
    } catch (error: unknown) {
      setKeyUrlSelectionError(
        error instanceof Error
          ? error.message
          : "An unknown error occurred during key URL selection."
      );
      setIsSelectingKeyUrls(false);
      setIsRunningFullAnalysis(false);
      return;
    } finally {
      setIsSelectingKeyUrls(false);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // 2. Business Analysis
    setIsAnalyzingBusiness(true);
    try {
      const companyIdFromStorage = localStorage.getItem("companyId");
      if (!companyIdFromStorage)
        throw new Error(
          "Website ID (companyId) not found. Cannot proceed with analysis."
        );
      const response = await fetch("/api/ai/analyze-business-from-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyUrls: selectedKeyUrls,
          websiteId: companyIdFromStorage,
          model: "gpt-4.1-mini-2025-04-14",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to analyze business content: ${response.status} ${
            response.statusText
          } - ${
            errorData.error ||
            errorData.details ||
            "No additional error details provided."
          }`
        );
      }
      const data = await response.json();
      if (data && data.analysis) {
        setBusinessAnalysis(data.analysis as string);
        setBusinessAnalysisCompleted(true);
        isBusinessAnalysisCompleted = true;
        businessAnalysis = data.analysis as string;
      } else {
        throw new Error(
          "Received an unexpected response from the business analysis service."
        );
      }
    } catch (error: unknown) {
      setBusinessAnalysisError(
        error instanceof Error
          ? error.message
          : "An unknown error occurred during business analysis."
      );
      setIsAnalyzingBusiness(false);
      setIsRunningFullAnalysis(false);
      return;
    } finally {
      setIsAnalyzingBusiness(false);
    }

    // 3. Content Structure Analysis
    setIsAnalyzingContentStructure(true);
    try {
      const companyIdFromStorage = localStorage.getItem("companyId");
      if (!companyIdFromStorage)
        throw new Error(
          "Website ID (companyId) not found. Cannot proceed with content structure analysis."
        );
      const response = await fetch("/api/ai/analyze-content-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyUrls: selectedKeyUrls,
          websiteId: companyIdFromStorage,
          model: "gpt-4.1-mini-2025-04-14",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to analyze content structure: ${response.status} ${
            response.statusText
          } - ${
            errorData.error ||
            errorData.details ||
            "No additional error details provided."
          }`
        );
      }
      const data = await response.json();
      if (data && data.analysis) {
        setContentStructureAnalysis(data.analysis as string);
        setContentStructureAnalysisCompleted(true);
        isContentStructureAnalysisCompleted = true;
        contentStructureAnalysis = data.analysis as string;
      } else {
        throw new Error(
          "Received an unexpected response from the content structure analysis service."
        );
      }
    } catch (error: unknown) {
      setContentStructureAnalysisError(
        error instanceof Error
          ? error.message
          : "An unknown error occurred during content structure analysis."
      );
      setIsAnalyzingContentStructure(false);
      setIsRunningFullAnalysis(false);
      return;
    } finally {
      setIsAnalyzingContentStructure(false);
      setIsRunningFullAnalysis(false);

      // After all analyses are complete, save to DB
      if (isBusinessAnalysisCompleted && isContentStructureAnalysisCompleted) {
        const companyIdFromStorage = localStorage.getItem("companyId");
        if (
          companyIdFromStorage &&
          businessAnalysis &&
          contentStructureAnalysis
        ) {
          try {
            await fetch("/api/website/save-analysis", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                websiteId: companyIdFromStorage,
                businessAnalysis: businessAnalysis,
                contentStructureAnalysis: contentStructureAnalysis,
                keyUrls: selectedKeyUrls,
              }),
            });
            console.log("Analysis data saved to DB.");
          } catch (dbError) {
            console.error("Error saving analysis to DB:", dbError);
            // Optionally, set an error state here to inform the user
          }
        }
      }
    }
  };

  const handleIndexSitemap = async () => {
    // Reset states
    setIsLoading(true);
    setApiError(null);
    setIndexingCompleted(false);
    setAllUrls([]);
    setIsRunningFullAnalysis(false);

    const companyIdFromStorage = localStorage.getItem("companyId");

    if (!companyIdFromStorage) {
      console.error("Error: companyId not found in localStorage.");
      setApiError(
        "Website ID (companyId) not found. Please ensure you are logged in or have a selected company."
      );
      setIsLoading(false);
      return;
    }

    const websiteId = companyIdFromStorage;
    console.log(
      `Using websiteId (companyId from localStorage) for indexing: ${websiteId}`
    );

    try {
      const response = await fetch("/api/index-sitemap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sitemapUrl,
          websiteId,
        }),
      });

      if (!response.ok) {
        console.log(
          "API response on error:",
          JSON.stringify(response, null, 2)
        );
        let errorDetails = "";
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || errorData.details || "";
        } catch {
          errorDetails = "";
        }
        throw new Error(
          `Failed to index sitemap: ${response.status} ${response.statusText} ${
            errorDetails ? "- " + errorDetails : ""
          }`
        );
      }

      const data = await response.json();
      console.log(
        "API response from /index-sitemap:",
        JSON.stringify(data, null, 2)
      );
      try {
        if (data && Array.isArray(data.urls)) {
          setAllUrls(data.urls);
        } else {
          setAllUrls([]);
          console.warn(
            "API response for 'urls' from /index-sitemap was not an array or was missing. Received:",
            data
          );
        }
        if (data && typeof data.stats === "object" && data.stats !== null) {
          setProcessingStats(data.stats as ProcessingStats);
        } else {
          setProcessingStats(null);
          console.warn(
            "API response for 'stats' from /index-sitemap was not a valid object or was missing. Received:",
            data
          );
        }
      } catch (processingError: unknown) {
        console.error(
          "Error processing data structure from /index-sitemap API:",
          processingError,
          "Original data received:",
          data
        );
        setApiError(
          processingError instanceof Error
            ? `Error processing /index-sitemap API data: ${processingError.message}`
            : "Error processing data received from /index-sitemap server."
        );
        setAllUrls([]);
        setProcessingStats(null);
      }
      setIndexingCompleted(true); // Mark new indexing as complete
    } catch (error: unknown) {
      console.error("Error indexing sitemap:", error);
      if (error instanceof Error) {
        setApiError(
          error.message || "An error occurred while indexing the sitemap."
        );
      } else {
        setApiError("An unknown error occurred while indexing the sitemap.");
      }
      setIndexingCompleted(false); // Ensure this is false on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-purple-500">
            Content Intelligence Hub
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Provide your sitemap URL to extract all website URLs. If already
            indexed, you can analyze your content in one click.
          </p>

          {/* URL Input */}
          {allUrls.length === 0 && (
            <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto mt-6">
              <Input
                placeholder="Enter your sitemap URL"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={handleIndexSitemap}
                disabled={isLoading || !sitemapUrl}
              >
                <Search className="mr-2 h-4 w-4" />
                Extract URLs
              </Button>
            </div>
          )}
        </div>

        {/* Main Content */}
        {allUrls.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Extracted URLs */}
            <Card className="shadow-md border-0">
              <CardHeader className="pb-2 relative">
                <div className="flex items-center gap-2">
                  <div className="bg-purple-100 p-2 rounded-md">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle>Extracted URLs</CardTitle>
                  <div className="ml-auto">
                    <HoverCard openDelay={100} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <button
                          type="button"
                          className="p-2 rounded hover:bg-red-100 text-red-600 transition-colors"
                          aria-label="Delete Analysis Data"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const companyIdFromStorage =
                              localStorage.getItem("companyId");
                            if (!companyIdFromStorage) return;
                            setIsLoading(true);
                            setApiError(null);
                            try {
                              const response = await fetch(
                                `/api/get-sitemap-urls?websiteId=${companyIdFromStorage}`,
                                { method: "DELETE" }
                              );
                              if (!response.ok) {
                                const errorData = await response
                                  .json()
                                  .catch(() => ({}));
                                throw new Error(
                                  `Failed to delete analysis data: ${
                                    response.status
                                  } ${errorData.details || response.statusText}`
                                );
                              }
                              setKeyUrls([]);
                              setBusinessAnalysis(null);
                              setBusinessAnalysisCompleted(false);
                              setContentStructureAnalysis(null);
                              setContentStructureAnalysisCompleted(false);
                              setAllUrls([]);
                              setProcessingStats(null);
                              setIndexingCompleted(false);
                            } catch (error) {
                              setApiError(
                                error instanceof Error
                                  ? error.message
                                  : "Failed to delete analysis data."
                              );
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                          disabled={isLoading || isRunningFullAnalysis}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent className="text-sm">
                        Delete Analysis Data
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                </div>
                <CardDescription>
                  {allUrls.length} URLs extracted from your sitemap. Ready for
                  analysis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <div className="space-y-4">
                    {allUrls.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="w-6 h-6 flex items-center justify-center p-0"
                        >
                          {idx + 1}
                        </Badge>
                        <span
                          className="text-sm text-blue-600 truncate hover:underline cursor-pointer"
                          title={url}
                        >
                          {url}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button
                  className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                  onClick={runFullAnalysis}
                  disabled={
                    isRunningFullAnalysis ||
                    isSelectingKeyUrls ||
                    isAnalyzingBusiness ||
                    isAnalyzingContentStructure
                  }
                >
                  <BarChart2 className="mr-2 h-4 w-4" />
                  {isRunningFullAnalysis ? "Analyzing..." : "Analyze"}
                </Button>
                {isLoading && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Extracting URLs from sitemap</span>
                      <span>Please wait...</span>
                    </div>
                    <Progress value={null} className="h-2" />
                    <p className="text-xs text-muted-foreground pt-1">
                      This might take a moment for large sitemaps.
                    </p>
                  </div>
                )}
                {apiError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{apiError}</AlertDescription>
                  </Alert>
                )}
                {indexingCompleted && processingStats && (
                  <Alert className="mt-4 bg-green-500/10 text-green-700 border-green-500/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Extraction Complete</AlertTitle>
                    <AlertDescription>
                      <p className="mb-1">
                        Successfully extracted{" "}
                        {processingStats.returnedUrlCount} URLs (discovered{" "}
                        {processingStats.discoveredUrlCount}
                        {processingStats.capped ? ", API capped results" : ""}).
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Key URL Analysis */}
            <Card className="shadow-md border-0">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-purple-100 p-2 rounded-md">
                    <Link2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle>Key URL Analysis</CardTitle>
                </div>
                <CardDescription>Key URLs Selected by AI</CardDescription>
              </CardHeader>
              <CardContent>
                {isSelectingKeyUrls && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>AI is selecting key URLs...</span>
                      <span>Please wait...</span>
                    </div>
                    <Progress value={null} className="h-2" />
                  </div>
                )}
                {keyUrlSelectionError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Analysis Error</AlertTitle>
                    <AlertDescription>{keyUrlSelectionError}</AlertDescription>
                  </Alert>
                )}
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>URL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keyUrls.map((url, index) => (
                        <TableRow key={`key-url-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell
                            className="text-blue-600 hover:underline cursor-pointer"
                            title={url}
                          >
                            {url}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analysis Tabs */}
        {allUrls.length > 0 && (
          <Tabs defaultValue="business" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="business" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Business Understanding
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <FileBarChart2 className="h-4 w-4" />
                Content Structure & Style
              </TabsTrigger>
            </TabsList>

            <TabsContent value="business">
              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">
                    Business Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isAnalyzingBusiness && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>AI is analyzing business content...</span>
                        <span>Crawling pages and thinking...</span>
                      </div>
                      <Progress value={null} className="h-2" />
                    </div>
                  )}
                  {businessAnalysisError && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Business Analysis Error</AlertTitle>
                      <AlertDescription>
                        {businessAnalysisError}
                      </AlertDescription>
                    </Alert>
                  )}
                  {businessAnalysisCompleted && businessAnalysis && (
                    <div className="mt-4 prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {businessAnalysis}
                      </ReactMarkdown>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content">
              <Card className="shadow-md border-0">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">
                    Content Structure & Style Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isAnalyzingContentStructure && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>AI is analyzing content structure...</span>
                        <span>Scanning pages for patterns...</span>
                      </div>
                      <Progress value={null} className="h-2" />
                    </div>
                  )}
                  {contentStructureAnalysisError && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Content Structure Analysis Error</AlertTitle>
                      <AlertDescription>
                        {contentStructureAnalysisError}
                      </AlertDescription>
                    </Alert>
                  )}
                  {contentStructureAnalysisCompleted &&
                    contentStructureAnalysis && (
                      <div className="mt-4 prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {contentStructureAnalysis}
                        </ReactMarkdown>
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
