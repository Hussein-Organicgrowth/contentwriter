"use client";

import { useState } from "react";
import { Globe, Plus } from "lucide-react";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Company {
  name: string;
  domain: string;
  description: string;
  toneOfVoice: string;
}

export function AddCompanyDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingTone, setIsAnalyzingTone] = useState(false);
  const [company, setCompany] = useState<Company>({
    name: "",
    domain: "",
    description: "",
    toneOfVoice: "",
  });

  const analyzeWebsite = async () => {
    if (!company.domain) {
      toast.error("Please enter a website URL");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: company.domain }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze website");
      }

      const data = await response.json();
      if (data.summary) {
        setCompany((prev) => ({
          ...prev,
          description: data.summary,
        }));
        toast.success("Website analyzed successfully!");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to analyze website");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeToneOfVoice = async () => {
    if (!company.description) {
      toast.error("Please enter a company description first");
      return;
    }

    setIsAnalyzingTone(true);
    try {
      const response = await fetch("/api/analyze-tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: company.toneOfVoice }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze tone");
      }

      const data = await response.json();
      if (data.tone) {
        setCompany((prev) => ({
          ...prev,
          toneOfVoice: data.tone,
        }));
        toast.success("Tone analyzed successfully!");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to analyze tone");
    } finally {
      setIsAnalyzingTone(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company.name || !company.domain) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Here you would typically make an API call to save the company
      // For now, we'll just close the dialog
      setIsOpen(false);
      toast.success("Company added successfully!");
      setCompany({
        name: "",
        domain: "",
        description: "",
        toneOfVoice: "",
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to add company");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl">Add New Company</DialogTitle>
            <DialogDescription className="text-base">
              Add your company details below. You can either manually enter the
              information or let us analyze your website.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 space-y-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={company.name}
                onChange={(e) =>
                  setCompany((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter company name"
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="domain" className="text-sm font-medium">
                Company Website <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="domain"
                  type="url"
                  className="flex-1 h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={company.domain}
                  onChange={(e) =>
                    setCompany((prev) => ({ ...prev, domain: e.target.value }))
                  }
                  placeholder="https://example.com"
                  required
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={analyzeWebsite}
                  disabled={isAnalyzing}
                  className="px-4 rounded-lg"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Company Description
              </label>
              <textarea
                id="description"
                className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                value={company.description}
                onChange={(e) =>
                  setCompany((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter company description or analyze your website"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="toneOfVoice" className="text-sm font-medium">
                  Tone of Voice
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={analyzeToneOfVoice}
                  disabled={isAnalyzingTone || !company.description}
                  className="h-8 px-3 text-xs"
                >
                  {isAnalyzingTone ? (
                    <>
                      <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-2 h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                      Analyze Tone
                    </>
                  )}
                </Button>
              </div>
              <textarea
                id="toneOfVoice"
                className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                value={company.toneOfVoice}
                onChange={(e) =>
                  setCompany((prev) => ({
                    ...prev,
                    toneOfVoice: e.target.value,
                  }))
                }
                placeholder="Enter tone of voice manually or analyze it from your description"
              />
              {!company.description && (
                <p className="text-xs text-muted-foreground">
                  Add a company description first to analyze the tone of voice
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 bg-gray-50/90 dark:bg-gray-800/50">
            <Button type="submit" className="w-full sm:w-auto rounded-lg">
              Add Company
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
