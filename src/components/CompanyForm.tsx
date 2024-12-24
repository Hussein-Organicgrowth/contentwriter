import { useState } from "react";
import { toast } from "react-hot-toast";

interface CompanyInfo {
  name: string;
  website: string;
  description: string;
  summary: string;
}

interface CompanyFormProps {
  onComplete: (companyInfo: CompanyInfo) => void;
}

export default function CompanyForm({ onComplete }: CompanyFormProps) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "",
    website: "",
    description: "",
    summary: "",
  });
  const [isAnalyzingWebsite, setIsAnalyzingWebsite] = useState(false);

  const analyzeWebsite = async () => {
    if (!companyInfo.website) {
      toast.error("Please enter a website URL");
      return;
    }

    setIsAnalyzingWebsite(true);
    try {
      const response = await fetch("/api/analyze-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: companyInfo.website }),
      });
      const data = await response.json();
      if (data.summary) {
        setCompanyInfo((prev) => ({
          ...prev,
          summary: data.summary,
        }));
        toast.success("Website analyzed successfully!");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to analyze website");
    }
    setIsAnalyzingWebsite(false);
  };

  const handleSubmit = () => {
    if (!companyInfo.name) {
      toast.error("Please enter your company name");
      return;
    }
    onComplete(companyInfo);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Company Information
          </h1>
          <p className="mt-3 text-[var(--secondary)] text-lg">
            Let&apos;s start by gathering some information about your company
          </p>
        </div>

        <div className="space-y-6 bg-white dark:bg-gray-800/50 rounded-2xl p-8 shadow-lg backdrop-blur-lg">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--secondary)]">
              Company Name
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              value={companyInfo.name}
              onChange={(e) =>
                setCompanyInfo((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter your company name"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--secondary)]">
              Company Website
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                value={companyInfo.website}
                onChange={(e) =>
                  setCompanyInfo((prev) => ({
                    ...prev,
                    website: e.target.value,
                  }))
                }
                placeholder="https://your-company.com"
              />
              <button
                onClick={analyzeWebsite}
                disabled={isAnalyzingWebsite}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-all duration-200 whitespace-nowrap font-medium flex items-center gap-2"
              >
                {isAnalyzingWebsite ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Analyze
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--secondary)]">
              Company Description
            </label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 min-h-[120px] resize-y"
              value={companyInfo.description}
              onChange={(e) =>
                setCompanyInfo((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter a brief description of your company"
            />
          </div>

          {companyInfo.summary && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--secondary)]">
                Website Summary
              </label>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <p className="text-[var(--secondary)]">{companyInfo.summary}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-all duration-200 font-medium mt-4"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
