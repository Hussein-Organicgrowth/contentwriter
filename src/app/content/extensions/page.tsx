"use client";

import { useState } from "react";
import RewriteTextEditor from "@/components/RewriteTextEditor";

export default function ExtensionsPage() {
  const [content, setContent] = useState("");
  const [mainKeyword, setMainKeyword] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const analyzeContent = async () => {
    if (!content || !mainKeyword) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/content/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, mainKeyword }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze content");
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
    } catch (error) {
      console.error("Error analyzing content:", error);
      setError("Failed to analyze content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const rewriteSection = async (section: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/content/rewrite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ section, mainKeyword }),
      });

      if (!response.ok) {
        throw new Error("Failed to rewrite section");
      }

      const data = await response.json();
      setContent((prev) =>
        prev.replace(section, data.rewrittenContent || section)
      );
    } catch (error) {
      console.error("Error rewriting section:", error);
      setError("Failed to rewrite section. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Content Optimizer
        </h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Keyword
              </label>
              <input
                type="text"
                value={mainKeyword}
                onChange={(e) => setMainKeyword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter main keyword"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL (Optional)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter URL to crawl content"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <RewriteTextEditor
                content={content}
                onChange={setContent}
                mainKeyword={mainKeyword}
                onAnalyze={analyzeContent}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              AI Suggestions
            </h2>
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-md">
                  <p className="text-gray-700">{suggestion}</p>
                  <button
                    onClick={() => rewriteSection(suggestion)}
                    disabled={isLoading}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    Apply this suggestion
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
