"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Trash2, Send } from "lucide-react";

export default function TrainAiPage() {
  // Step 1: Language selection and profile
  const [language, setLanguage] = useState<string>("");
  const [languageInput, setLanguageInput] = useState<string>("");
  const [languageProfile, setLanguageProfile] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileAccepted, setProfileAccepted] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Step 2: Training status and instructions (only after language profile accepted)
  const [trainingProgress] = useState(40); // percent
  const [input, setInput] = useState("");
  const [instructions, setInstructions] = useState([
    { id: 1, text: "Always use a friendly, conversational tone." },
    { id: 2, text: "Do not include pricing information." },
    { id: 3, text: "Focus on actionable SEO tips." },
  ]);

  const handleSend = () => {
    if (input.trim()) {
      setInstructions([
        ...instructions,
        { id: Date.now(), text: input.trim() },
      ]);
      setInput("");
    }
  };

  const handleDelete = (id: number) => {
    setInstructions(instructions.filter((inst) => inst.id !== id));
  };

  // Step 1: Handle language selection and fetch profile
  const handleLanguageSubmit = async () => {
    if (!languageInput.trim()) return;
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      // Mock API call - replace with real endpoint
      const response = await fetch("/api/ai/language-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: languageInput.trim() }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch language profile");
      }
      const data = await response.json();
      setLanguageProfile(data.profile || "");
      setLanguage(languageInput.trim());
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Could not fetch language profile."
      );
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // UI: Step 1 - Language selection
  if (!language) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-secondary/10 p-4">
        <Card className="max-w-lg w-full mx-auto border-primary/20 p-6">
          <CardHeader>
            <CardTitle className="text-2xl">
              Select Your Primary Language
            </CardTitle>
            <CardDescription>
              Choose the main language you want to write your content in. This
              helps the AI understand your style and conventions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border border-primary/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. English, Danish, Spanish..."
                value={languageInput}
                onChange={(e) => setLanguageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLanguageSubmit();
                }}
                disabled={isLoadingProfile}
              />
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleLanguageSubmit}
                disabled={!languageInput.trim() || isLoadingProfile}
              >
                {isLoadingProfile ? "Loading..." : "Continue"}
              </Button>
            </div>
            {profileError && (
              <p className="text-red-500 text-sm mt-2">{profileError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // UI: Step 1b - Show language profile if not accepted
  if (language && languageProfile && !profileAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-secondary/10 p-4">
        <Card className="max-w-xl w-full mx-auto border-primary/20 p-6">
          <CardHeader>
            <CardTitle className="text-2xl">
              Language Profile: {language}
            </CardTitle>
            <CardDescription>
              Here&apos;s what the AI will focus on when writing in{" "}
              <span className="font-semibold text-primary">{language}</span>:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none mb-6 whitespace-pre-line text-foreground">
              {languageProfile}
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 w-full"
              onClick={() => setProfileAccepted(true)}
            >
              Accept &amp; Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // UI: Step 2 - Training status and preferences
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/10 p-4 md:p-8 lg:p-12">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="inline-block px-6 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-2">
            AI Training
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl text-foreground">
            Train Your AI
          </h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Teach the AI how you want your content written. Give it rules,
            preferences, and examples to ensure every piece matches your style.
          </p>
        </div>

        {/* Training Status */}
        <Card className="max-w-2xl mx-auto mb-12 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">Training Status</CardTitle>
            <CardDescription>
              Language:{" "}
              <span className="font-semibold text-primary">{language}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress
                value={trainingProgress}
                className="w-full [&>div]:bg-primary"
              />
              <span className="text-primary font-bold min-w-[48px] text-lg">
                {trainingProgress}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {trainingProgress < 100
                ? "Keep training your AI to improve its understanding of your preferences."
                : "Your AI is fully trained!"}
            </p>
          </CardContent>
        </Card>

        {/* Main Content: Chat + Saved Instructions */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Chat Interface */}
          <Card className="border-primary/20 flex flex-col h-[500px]">
            <CardHeader>
              <CardTitle>Training Chat</CardTitle>
              <CardDescription>
                Type how you want your content written. Example: &quot;Never use
                passive voice.&quot;
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="flex-1 overflow-y-auto mb-4">
                {/* Show last 5 instructions as chat bubbles */}
                {instructions.slice(-5).map((inst) => (
                  <div key={inst.id} className="mb-2 flex justify-end">
                    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg max-w-xs text-right shadow">
                      {inst.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-auto">
                <input
                  className="flex-1 rounded border border-primary/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Type your instruction..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                />
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={handleSend}
                  disabled={!input.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Saved Instructions */}
          <Card className="border-primary/20 flex flex-col h-[500px]">
            <CardHeader>
              <CardTitle>Saved Preferences</CardTitle>
              <CardDescription>
                All your saved training instructions.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2">
              {instructions.length === 0 ? (
                <p className="text-muted-foreground text-center mt-16">
                  No preferences saved yet.
                </p>
              ) : (
                instructions.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between bg-primary/5 rounded px-3 py-2"
                  >
                    <span className="text-foreground text-sm">{inst.text}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:bg-red-100"
                      onClick={() => handleDelete(inst.id)}
                      aria-label="Delete preference"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
