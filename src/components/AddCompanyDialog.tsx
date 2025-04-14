"use client";

import { useState } from "react";
import { Globe, Plus, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

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
import { Progress } from "@/components/ui/progress";

interface Company {
  name: string;
  domain: string;
  description: string;
  toneOfVoice: string;
  targetAudience: string;
}

type Step = "basic" | "description" | "analysis";

export function AddCompanyDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("basic");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingTone, setIsAnalyzingTone] = useState(false);
  const [isAnalyzingAudience, setIsAnalyzingAudience] = useState(false);
  const [company, setCompany] = useState<Company>({
    name: "",
    domain: "",
    description: "",
    toneOfVoice: "",
    targetAudience: "",
  });

  const steps: { id: Step; title: string; description: string }[] = [
    {
      id: "basic",
      title: "Basic Information",
      description: "Enter your company's name and website",
    },
    {
      id: "description",
      title: "Company Description",
      description: "Let AI analyze your website or add your own description",
    },
    {
      id: "analysis",
      title: "AI Analysis",
      description: "Review and enhance AI-generated insights",
    },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case "basic":
        return company.name && company.domain;
      case "description":
        return company.description;
      case "analysis":
        return company.toneOfVoice.trim() && company.targetAudience.trim();
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const currentIndex = steps.findIndex((step) => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.findIndex((step) => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

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
      const response = await fetch("/api/tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleText: company.description }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze tone");
      }

      const data = await response.json();
      if (
        data.tone ||
        data.style ||
        data.voice ||
        data.language ||
        data.engagement
      ) {
        const toneOfVoiceText = [
          "TONE:",
          data.tone,
          "\nSTYLE:",
          data.style,
          "\nVOICE:",
          data.voice,
          "\nLANGUAGE:",
          data.language,
          "\nENGAGEMENT:",
          data.engagement,
        ].join("\n");

        setCompany((prev) => ({
          ...prev,
          toneOfVoice: toneOfVoiceText,
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

  const analyzeTargetAudience = async () => {
    if (!company.description) {
      toast.error("Please enter a company description first");
      return;
    }

    setIsAnalyzingAudience(true);
    try {
      const response = await fetch("/api/analyze-target-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: company.description }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze target audience");
      }

      const data = await response.json();
      if (
        data.demographics &&
        data.psychographics &&
        data.behavior &&
        data.geography
      ) {
        const targetAudienceText = [
          "Demographics:",
          data.demographics,
          "\nPsychographics:",
          data.psychographics,
          "\nBehavior:",
          data.behavior,
          "\nGeography:",
          data.geography,
        ].join("\n");

        setCompany((prev) => ({
          ...prev,
          targetAudience: targetAudienceText,
        }));
        toast.success("Target audience analyzed successfully!");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to analyze target audience");
    } finally {
      setIsAnalyzingAudience(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company.name || !company.domain) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!company.toneOfVoice.trim() || !company.targetAudience.trim()) {
      toast.error(
        "Please complete the tone of voice and target audience analysis"
      );
      return;
    }

    // Ensure URL starts with https://
    let websiteUrl = company.domain;
    if (
      !websiteUrl.startsWith("http://") &&
      !websiteUrl.startsWith("https://")
    ) {
      websiteUrl = `https://${websiteUrl}`;
    }

    try {
      const response = await fetch("/api/website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: company.name,
          website: websiteUrl,
          description: company.description,
          summary: company.description,
          toneofvoice: company.toneOfVoice,
          targetAudience: company.targetAudience,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create website");
      }

      setIsOpen(false);
      toast.success("Company added successfully!");
      setCompany({
        name: "",
        domain: "",
        description: "",
        toneOfVoice: "",
        targetAudience: "",
      });
      setCurrentStep("basic");

      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to add company");
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "basic":
        return (
          <div className="space-y-4">
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
              <input
                id="domain"
                type="url"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={company.domain}
                onChange={(e) => {
                  let value = e.target.value;
                  if (
                    value &&
                    !value.startsWith("http://") &&
                    !value.startsWith("https://")
                  ) {
                    value = `https://${value}`;
                  }
                  setCompany((prev) => ({ ...prev, domain: value }));
                }}
                placeholder="https://example.com"
                required
              />
            </div>
          </div>
        );

      case "description":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Let AI analyze your website</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We&apos;ll analyze your website to understand your
                company&apos;s mission, values, and unique selling points.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={analyzeWebsite}
                disabled={isAnalyzing}
                className="w-full sm:w-auto"
              >
                {isAnalyzing ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Analyzing website...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Analyze Website
                  </>
                )}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or write your own
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Company Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                className="flex min-h-[200px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                value={company.description}
                onChange={(e) =>
                  setCompany((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter a detailed description of your company, including your mission, values, and what makes you unique. This will help us analyze your tone of voice and target audience."
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Tips for a good description:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Include your company&apos;s mission and values</li>
                <li>Describe your unique selling points</li>
                <li>Mention your target market</li>
                <li>Share your brand personality</li>
              </ul>
            </div>
          </div>
        );

      case "analysis":
        return (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">AI-Generated Insights</h3>
              <p className="text-sm text-muted-foreground">
                Based on your company description, we&apos;ve generated insights
                about your tone of voice and target audience. You can review and
                edit these insights below.
              </p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="toneOfVoice" className="text-sm font-medium">
                  Tone of Voice <span className="text-red-500">*</span>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={analyzeToneOfVoice}
                  disabled={isAnalyzingTone || !company.toneOfVoice.trim()}
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
                      Analyze
                    </>
                  )}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                <p>
                  To analyze your tone of voice, we need text from your company.
                  This can be:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Your company&apos;s website content</li>
                  <li>Marketing materials</li>
                  <li>Social media posts</li>
                  <li>Customer communications</li>
                </ul>
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
                placeholder="Paste your company's text here to analyze the tone of voice..."
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="targetAudience" className="text-sm font-medium">
                  Target Audience <span className="text-red-500">*</span>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={analyzeTargetAudience}
                  disabled={isAnalyzingAudience || !company.description}
                  className="h-8 px-3 text-xs"
                >
                  {isAnalyzingAudience ? (
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
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
              <textarea
                id="targetAudience"
                className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                value={company.targetAudience}
                onChange={(e) =>
                  setCompany((prev) => ({
                    ...prev,
                    targetAudience: e.target.value,
                  }))
                }
                placeholder="AI will analyze your target audience based on your description"
                required
              />
            </div>
          </div>
        );
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
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl">Add New Company</DialogTitle>
            <DialogDescription className="text-base">
              {steps[currentStepIndex].description}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <Progress value={progress} className="mb-6" />
            {currentStep === "analysis" ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {renderStepContent()}
                <DialogFooter className="p-6 bg-gray-50/90 dark:bg-gray-800/50 sticky bottom-0">
                  <div className="flex gap-2 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={!canProceed()}
                      variant="secondary"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Add Company
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            ) : (
              <>
                {renderStepContent()}
                <DialogFooter className="p-6 bg-gray-50/90 dark:bg-gray-800/50 sticky bottom-0">
                  <div className="flex gap-2 w-full">
                    {currentStepIndex > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        className="flex-1"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="flex-1"
                      disabled={!canProceed()}
                      variant="secondary"
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </DialogFooter>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
