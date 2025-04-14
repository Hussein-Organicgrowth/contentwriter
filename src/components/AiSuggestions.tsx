"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { Editor } from "@tiptap/core";

interface Suggestion {
	original?: string;
	suggestion: string;
	reason: string;
	type?: string;
	title?: string;
	description?: string;
}

interface Analysis {
	headlines: Suggestion[];
	sections: Suggestion[];
	improvements: Suggestion[];
}

interface AiSuggestionsProps {
	editor: Editor | null;
	isLoading: boolean;
	onAnalyze: () => void;
	analysis: Analysis | null;
}

export default function AiSuggestions({
	editor,
	isLoading,
	onAnalyze,
	analysis,
}: AiSuggestionsProps) {
	const [expandedSections, setExpandedSections] = useState<{
		headlines: boolean;
		sections: boolean;
		improvements: boolean;
	}>({
		headlines: true,
		sections: true,
		improvements: true,
	});

	const toggleSection = (section: keyof typeof expandedSections) => {
		setExpandedSections((prev) => ({
			...prev,
			[section]: !prev[section],
		}));
	};

	const applyHeadlineSuggestion = (suggestion: Suggestion) => {
		if (!editor || !suggestion.original) return;

		// Find and replace the headline
		editor.state.doc.descendants((node, pos) => {
			if (node.type.name === "heading") {
				const text = node.textContent;
				if (text === suggestion.original) {
					editor
						.chain()
						.focus()
						.command(({ tr }) => {
							tr.insertText(suggestion.suggestion, pos, pos + node.nodeSize);
							return true;
						})
						.run();
				}
			}
		});
	};

	const addNewSection = (section: Suggestion) => {
		if (!editor || !section.title || !section.description) return;

		editor
			.chain()
			.focus()
			.insertContent([
				{
					type: "heading",
					attrs: { level: 2 },
					content: [{ type: "text", text: section.title }],
				},
				{
					type: "paragraph",
					content: [{ type: "text", text: section.description }],
				},
			])
			.run();
	};

	const applyImprovement = (improvement: Suggestion) => {
		if (!editor || !improvement.type) return;

		// Insert the improvement as a comment
		editor
			.chain()
			.focus()
			.insertContent({
				type: "paragraph",
				content: [
					{
						type: "text",
						text: `[${improvement.type}] ${improvement.suggestion}`,
					},
				],
			})
			.run();
	};

	return (
		<Card className="p-4">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-lg font-semibold">AI Suggestions</h2>
				<Button
					variant="outline"
					size="sm"
					onClick={onAnalyze}
					disabled={isLoading}
					className="flex items-center gap-2">
					{isLoading ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<Wand2 className="w-4 h-4" />
					)}
					Analyze Content
				</Button>
			</div>

			<ScrollArea className="h-[400px]">
				{analysis ? (
					<div className="space-y-4">
						{/* Headlines Section */}
						<div>
							<div
								className="flex items-center justify-between cursor-pointer"
								onClick={() => toggleSection("headlines")}>
								<h3 className="font-medium">Headline Suggestions</h3>
								{expandedSections.headlines ? (
									<ChevronUp className="w-4 h-4" />
								) : (
									<ChevronDown className="w-4 h-4" />
								)}
							</div>
							{expandedSections.headlines && (
								<div className="mt-2 space-y-2">
									{analysis.headlines.map((headline, index) => (
										<div key={index} className="p-2 bg-gray-50 rounded-md">
											<div className="text-sm text-gray-600 mb-1">
												Original: {headline.original}
											</div>
											<div className="font-medium mb-1">
												{headline.suggestion}
											</div>
											<div className="text-sm text-gray-500 mb-2">
												{headline.reason}
											</div>
											<Button
												variant="outline"
												size="sm"
												onClick={() => applyHeadlineSuggestion(headline)}>
												Apply
											</Button>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Sections Section */}
						<div>
							<div
								className="flex items-center justify-between cursor-pointer"
								onClick={() => toggleSection("sections")}>
								<h3 className="font-medium">Suggested Sections</h3>
								{expandedSections.sections ? (
									<ChevronUp className="w-4 h-4" />
								) : (
									<ChevronDown className="w-4 h-4" />
								)}
							</div>
							{expandedSections.sections && (
								<div className="mt-2 space-y-2">
									{analysis.sections.map((section, index) => (
										<div key={index} className="p-2 bg-gray-50 rounded-md">
											<div className="font-medium mb-1">{section.title}</div>
											<div className="text-sm text-gray-600 mb-1">
												{section.description}
											</div>
											<div className="text-sm text-gray-500 mb-2">
												{section.reason}
											</div>
											<Button
												variant="outline"
												size="sm"
												onClick={() => addNewSection(section)}>
												Add Section
											</Button>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Improvements Section */}
						<div>
							<div
								className="flex items-center justify-between cursor-pointer"
								onClick={() => toggleSection("improvements")}>
								<h3 className="font-medium">Content Improvements</h3>
								{expandedSections.improvements ? (
									<ChevronUp className="w-4 h-4" />
								) : (
									<ChevronDown className="w-4 h-4" />
								)}
							</div>
							{expandedSections.improvements && (
								<div className="mt-2 space-y-2">
									{analysis.improvements.map((improvement, index) => (
										<div key={index} className="p-2 bg-gray-50 rounded-md">
											<div className="font-medium mb-1">
												{improvement.suggestion}
											</div>
											<div className="text-sm text-gray-500 mb-2">
												{improvement.reason}
											</div>
											<Button
												variant="outline"
												size="sm"
												onClick={() => applyImprovement(improvement)}>
												Apply
											</Button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				) : (
					<div className="text-center text-gray-500 py-8">
						Click "Analyze Content" to get AI suggestions
					</div>
				)}
			</ScrollArea>
		</Card>
	);
}
