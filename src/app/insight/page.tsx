"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, Loader2, Send, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import React, { createElement } from "react";

interface Message {
	role: "user" | "assistant" | "status";
	content: string;
}

interface KeywordInfo {
	se_type: string;
	last_updated_time: string;
	competition: number | null;
	competition_level: string;
	cpc: number | null;
	search_volume: number;
	monthly_searches: Array<{
		year: number;
		month: number;
		search_volume: number;
	}>;
	search_volume_trend: {
		monthly: number;
		quarterly: number;
		yearly: number;
	};
}

interface KeywordData {
	se_type: string;
	keyword: string;
	location_code: number;
	language_code: string;
	keyword_info: KeywordInfo;
	keyword_properties: {
		keyword_difficulty: number;
		detected_language: string;
		is_another_language: boolean;
	};
}

interface KeywordItem {
	se_type: string;
	keyword_data: KeywordData;
	depth: number;
	related_keywords: string[];
}

interface KeywordResult {
	se_type: string;
	seed_keyword: string;
	location_code: number;
	language_code: string;
	total_count: number;
	items_count: number;
	items: KeywordItem[];
}

// Language options based on common Google search markets
const LANGUAGES = [
	{ code: "en", name: "English (US)" },
	{ code: "en-gb", name: "English (UK)" },
	{ code: "es", name: "Spanish" },
	{ code: "fr", name: "French" },
	{ code: "de", name: "German" },
	{ code: "it", name: "Italian" },
	{ code: "pt", name: "Portuguese" },
	{ code: "ru", name: "Russian" },
	{ code: "ja", name: "Japanese" },
	{ code: "zh", name: "Chinese" },
	{ code: "nl", name: "Dutch" },
	{ code: "pl", name: "Polish" },
	{ code: "tr", name: "Turkish" },
	{ code: "ar", name: "Arabic" },
	{ code: "da", name: "Danish" },
] as const;

// QuestionItem component with improved visibility
const QuestionItem: React.FC<{
	content: string;
	index: number;
	isNumbered?: boolean;
	onAnswer: (content: string) => void;
}> = ({ content, index, isNumbered, onAnswer }) => {
	const [isAnswering, setIsAnswering] = useState(false);
	const [answer, setAnswer] = useState("");

	const handleSubmitAnswer = (e: React.FormEvent) => {
		e.preventDefault();
		if (answer.trim()) {
			onAnswer(answer);
			setIsAnswering(false);
			setAnswer("");
		}
	};

	return (
		<div className="bg-blue-50 rounded-lg p-4 border border-blue-200 shadow-sm">
			<div className="flex items-start gap-3">
				<div className="bg-blue-500 rounded-full p-2 text-white">
					<span className="font-medium">{isNumbered ? index + 1 : "Q"}</span>
				</div>
				<div className="flex-1">
					<p className="text-gray-800 font-medium text-lg mb-3">{content}</p>
					{!isAnswering ? (
						<div className="flex flex-wrap gap-2">
							<Button
								variant="default"
								size="default"
								onClick={() => setIsAnswering(true)}
								className="bg-blue-600 hover:bg-blue-700 text-white">
								Write Answer
							</Button>
							{content.toLowerCase().includes("yes") ||
							content.toLowerCase().includes("or") ? (
								<>
									<Button
										variant="outline"
										size="default"
										onClick={() => onAnswer("Yes")}
										className="bg-white hover:bg-green-50 border-green-200 text-green-700">
										Yes
									</Button>
									<Button
										variant="outline"
										size="default"
										onClick={() => onAnswer("No")}
										className="bg-white hover:bg-red-50 border-red-200 text-red-700">
										No
									</Button>
								</>
							) : null}
						</div>
					) : (
						<form onSubmit={handleSubmitAnswer} className="space-y-3">
							<Input
								value={answer}
								onChange={(e) => setAnswer(e.target.value)}
								placeholder="Type your answer here..."
								className="w-full"
								autoFocus
							/>
							<div className="flex gap-2">
								<Button
									type="submit"
									className="bg-blue-600 hover:bg-blue-700 text-white">
									Send Answer
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										setIsAnswering(false);
										setAnswer("");
									}}>
									Cancel
								</Button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
};

interface ListProps {
	children?: React.ReactNode;
	className?: string;
	onAnswer: (content: string) => void;
}

const ListContainer: React.FC<ListProps & { type: "ul" | "ol" }> = ({
	children,
	type,
	className,
	onAnswer,
}) => {
	const processChild = (child: any, index: number) => {
		if (!child?.props?.children) return null;
		const content = child.props.children[1] || "";
		const isQuestion = content.toString().trim().endsWith("?");

		if (isQuestion) {
			return (
				<QuestionItem
					key={index}
					content={content.toString()}
					index={index}
					isNumbered={type === "ol"}
					onAnswer={onAnswer}
				/>
			);
		}

		return createElement(
			type,
			{
				key: index,
				className: `${
					type === "ul" ? "list-disc" : "list-decimal"
				} list-inside mb-2 ${className || ""}`,
			},
			child
		);
	};

	return (
		<div className="space-y-2">
			{React.Children.map(children, (child, index) =>
				processChild(child, index)
			)}
		</div>
	);
};

// Updated MarkdownComponents with proper typing
const MarkdownComponents: Record<string, React.FC<any>> = {
	h1: ({ ...props }: React.ComponentPropsWithoutRef<"h1">) => (
		<h1 className="text-2xl font-bold mb-4" {...props} />
	),
	h2: ({ ...props }: React.ComponentPropsWithoutRef<"h2">) => (
		<h2 className="text-xl font-bold mb-3" {...props} />
	),
	h3: ({ ...props }: React.ComponentPropsWithoutRef<"h3">) => (
		<h3 className="text-lg font-bold mb-2" {...props} />
	),
	p: ({ ...props }: React.ComponentPropsWithoutRef<"p">) => (
		<p className="mb-2" {...props} />
	),
	ul: (props: ListProps) => (
		<ListContainer
			type="ul"
			{...props}
			onAnswer={(content) => handleSubmit(new Event("click") as any, content)}
		/>
	),
	ol: (props: ListProps) => (
		<ListContainer
			type="ol"
			{...props}
			onAnswer={(content) => handleSubmit(new Event("click") as any, content)}
		/>
	),
	li: ({ ...props }: React.ComponentPropsWithoutRef<"li">) => (
		<li className="mb-1" {...props} />
	),
	code: ({
		inline,
		className,
		children,
		...props
	}: {
		inline?: boolean;
		className?: string;
		children?: React.ReactNode;
	} & React.ComponentPropsWithoutRef<"code">) => {
		const match = /language-(\w+)/.exec(className || "");
		return !inline ? (
			<pre className="bg-gray-100 p-2 rounded mb-2 overflow-x-auto">
				<code className={className} {...props}>
					{children}
				</code>
			</pre>
		) : (
			<code className="bg-gray-100 px-1 rounded" {...props}>
				{children}
			</code>
		);
	},
};

export default function InsightPage() {
	const [userInput, setUserInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [selectedLanguage, setSelectedLanguage] = useState("en");
	const [messages, setMessages] = useState<Message[]>([
		{
			role: "assistant",
			content:
				"Hi! I'm your keyword research assistant. Tell me about your target audience or the products you want to promote, and I'll help you find relevant keywords with good search volume.",
		},
	]);
	const [keywords, setKeywords] = useState<KeywordResult[]>([]);
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const [suggestedResponses, setSuggestedResponses] = useState<string[]>([]);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	// Function to extract suggested responses from AI messages
	const extractSuggestedResponses = (message: string) => {
		// Split message into lines
		const lines = message.split("\n");
		const extractedQuestions: string[] = [];

		// Regular expressions for different question formats
		const questionPatterns = [
			/^[•\-*]?\s*(.+\?)\s*$/, // Bullet points with questions
			/^\d+\.\s*(.+\?)\s*$/, // Numbered lists with questions
			/^(.+\?)\s*$/, // Regular questions
			/[^.!?]+\?/g, // Questions within text
		];

		lines.forEach((line) => {
			// Clean the line of markdown formatting
			const cleanLine = line.replace(/[*_`#]/g, "").trim();

			// Skip empty lines
			if (!cleanLine) return;

			// Try each pattern
			for (const pattern of questionPatterns) {
				if (pattern.global) {
					// For patterns that can match multiple times in a line
					const matches = cleanLine.match(pattern);
					if (matches) {
						matches.forEach((match) => {
							const question = match.trim();
							if (question && !extractedQuestions.includes(question)) {
								extractedQuestions.push(question);
							}
						});
					}
				} else {
					// For patterns that match the whole line
					const match = cleanLine.match(pattern);
					if (match && match[1]) {
						const question = match[1].trim();
						if (question && !extractedQuestions.includes(question)) {
							extractedQuestions.push(question);
						}
					}
				}
			}
		});

		// Filter out duplicates and ensure each item is a proper question
		return extractedQuestions
			.filter(
				(q, index) =>
					extractedQuestions.indexOf(q) === index &&
					q.trim().endsWith("?") &&
					q.length > 10
			)
			.slice(0, 5); // Limit to 5 suggestions to avoid cluttering the UI
	};

	const handleCopyKeyword = async (text: string, index: number) => {
		await navigator.clipboard.writeText(text);
		setCopiedIndex(index);
		setTimeout(() => setCopiedIndex(null), 2000);
	};

	const copyAllKeywords = async (format: "simple" | "detailed") => {
		const text = keywords
			.flatMap((result: KeywordResult) =>
				result.items.map((item) => {
					if (format === "simple") {
						return item.keyword_data.keyword;
					}
					return `${
						item.keyword_data.keyword
					} (${item.keyword_data.keyword_info.search_volume.toLocaleString()} searches/mo, Competition: ${item.keyword_data.keyword_info.competition_level.toLowerCase()}, CPC: $${
						item.keyword_data.keyword_info.cpc?.toFixed(2) || "0.00"
					})`;
				})
			)
			.join("\n");
		await navigator.clipboard.writeText(text);
	};

	const handleSubmit = async (e: React.FormEvent, customInput?: string) => {
		e.preventDefault();
		const input = customInput || userInput;
		if (!input.trim() || loading) return;

		const newMessage: Message = { role: "user", content: input };
		setMessages((prev) => [...prev, newMessage]);
		setUserInput("");
		setSuggestedResponses([]); // Clear suggested responses when user sends a message
		setLoading(true);

		try {
			const response = await fetch("/api/insight/keywords", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompt: input,
					messages: [...messages, newMessage],
					language: selectedLanguage,
				}),
			});

			if (!response.ok) throw new Error("Network response was not ok");

			const reader = response.body?.getReader();
			if (!reader) throw new Error("No reader available");

			// Read the stream
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				// Convert the chunk to text
				const chunk = new TextDecoder().decode(value);
				const lines = chunk.split("\n");

				// Process each line
				for (const line of lines) {
					if (line.startsWith("data: ")) {
						try {
							const data = JSON.parse(line.slice(5));

							if (data.type === "status") {
								// Update status message
								setMessages((prev) => [
									...prev,
									{ role: "status", content: data.content.message },
								]);
							} else if (data.type === "complete") {
								// Clear any status messages and add the final response
								setMessages((prev) =>
									prev
										.filter((m) => m.role !== "status")
										.concat({
											role: "assistant",
											content: data.content.message,
										})
								);

								// Debug the incoming data
								console.log("Raw keyword data:", data.content.keywords);

								// Ensure we have valid keyword data and transform it if needed
								if (
									data.content.keywords &&
									Array.isArray(data.content.keywords)
								) {
									// Transform and filter out incomplete results
									const transformedKeywords = data.content.keywords
										.filter((result: any) => {
											// Check if this is a valid result with items
											return (
												result.items &&
												Array.isArray(result.items) &&
												result.items.length > 0
											);
										})
										.map((result: any) => ({
											seed_keyword: result.seed_keyword,
											se_type: result.se_type || "google",
											location_code: result.location_code,
											language_code: result.language_code,
											total_count: result.total_count,
											items_count: result.items_count,
											items: result.items,
										}));

									console.log("Transformed keywords:", transformedKeywords);

									// Only set keywords if we have valid transformed data
									if (transformedKeywords.length > 0) {
										setKeywords(transformedKeywords);
									} else {
										console.warn(
											"No valid keyword data found after transformation"
										);
										setKeywords([]);
									}
								} else {
									setKeywords([]);
									console.warn(
										"Received invalid keyword data:",
										data.content.keywords
									);
								}

								// After receiving AI response, extract suggested responses
								const aiMessage = data.content.message;
								const newSuggestions = extractSuggestedResponses(aiMessage);
								setSuggestedResponses(newSuggestions);
							} else if (data.type === "error") {
								setMessages((prev) => [
									...prev,
									{ role: "assistant", content: data.content.message },
								]);
							}
						} catch (e) {
							console.error("Error parsing chunk:", e);
						}
					}
				}
			}
		} catch (error) {
			console.error("Error:", error);
			setMessages((prev) => [
				...prev,
				{
					role: "assistant",
					content: "Sorry, I encountered an error. Please try again.",
				},
			]);
		} finally {
			setLoading(false);
		}
	};

	// Create markdown components with access to handleSubmit
	const markdownComponents = {
		h1: ({ ...props }: React.ComponentPropsWithoutRef<"h1">) => (
			<h1 className="text-2xl font-bold mb-4" {...props} />
		),
		h2: ({ ...props }: React.ComponentPropsWithoutRef<"h2">) => (
			<h2 className="text-xl font-bold mb-3" {...props} />
		),
		h3: ({ ...props }: React.ComponentPropsWithoutRef<"h3">) => (
			<h3 className="text-lg font-bold mb-2" {...props} />
		),
		p: ({ ...props }: React.ComponentPropsWithoutRef<"p">) => (
			<p className="mb-2" {...props} />
		),
		ul: ({ children, ...props }: React.ComponentPropsWithoutRef<"ul">) => {
			return (
				<div className="space-y-3">
					{React.Children.map(children, (child: any, index) => {
						if (!child?.props?.children) return null;
						const content = child.props.children.toString();
						const isQuestion = content.trim().endsWith("?");

						if (isQuestion) {
							return (
								<QuestionItem
									key={index}
									content={content}
									index={index}
									onAnswer={(answer) =>
										handleSubmit(new Event("click") as any, answer)
									}
								/>
							);
						}

						return (
							<ul className="list-disc list-inside mb-2" {...props}>
								{child}
							</ul>
						);
					})}
				</div>
			);
		},
		ol: ({ children, ...props }: React.ComponentPropsWithoutRef<"ol">) => {
			return (
				<div className="space-y-3">
					{React.Children.map(children, (child: any, index) => {
						if (!child?.props?.children) return null;
						const content = child.props.children.toString();
						const isQuestion = content.trim().endsWith("?");

						if (isQuestion) {
							return (
								<QuestionItem
									key={index}
									content={content}
									index={index}
									isNumbered
									onAnswer={(answer) =>
										handleSubmit(new Event("click") as any, answer)
									}
								/>
							);
						}

						return (
							<ol className="list-decimal list-inside mb-2" {...props}>
								{child}
							</ol>
						);
					})}
				</div>
			);
		},
		li: ({ ...props }: React.ComponentPropsWithoutRef<"li">) => (
			<li className="mb-1" {...props} />
		),
		code: ({
			inline,
			className,
			children,
			...props
		}: {
			inline?: boolean;
			className?: string;
			children?: React.ReactNode;
		} & React.ComponentPropsWithoutRef<"code">) => {
			const match = /language-(\w+)/.exec(className || "");
			return !inline ? (
				<pre className="bg-gray-100 p-2 rounded mb-2 overflow-x-auto">
					<code className={className} {...props}>
						{children}
					</code>
				</pre>
			) : (
				<code className="bg-gray-100 px-1 rounded" {...props}>
					{children}
				</code>
			);
		},
	};

	return (
		<div className="container mx-auto p-6">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-3xl font-bold">AI Keyword Research Assistant</h1>
				<div className="w-48">
					<Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
						<SelectTrigger>
							<SelectValue placeholder="Select Language" />
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
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<div className="bg-white rounded-lg shadow p-4 space-y-4 h-[600px] flex flex-col">
						<ScrollArea className="flex-1 pr-4">
							<div className="space-y-4">
								{messages.map((message, index) => (
									<div
										key={index}
										className={`flex ${
											message.role === "assistant" || message.role === "status"
												? "justify-start"
												: "justify-end"
										}`}>
										<div
											className={`rounded-lg p-4 max-w-[85%] ${
												message.role === "status"
													? "bg-blue-50 text-blue-700"
													: message.role === "assistant"
													? "bg-gray-100"
													: "bg-blue-500 text-white"
											}`}>
											<div className="flex items-start gap-3">
												{message.role === "status" && (
													<Loader2 className="h-4 w-4 animate-spin shrink-0 mt-1" />
												)}
												<div className="flex-1">
													{message.role === "status" ? (
														<div className="whitespace-pre-wrap">
															{message.content}
														</div>
													) : (
														<div className="space-y-3">
															<ReactMarkdown
																remarkPlugins={[remarkGfm]}
																components={markdownComponents}
																className={`markdown ${
																	message.role === "user"
																		? "text-white"
																		: "text-gray-800"
																}`}>
																{message.content}
															</ReactMarkdown>
														</div>
													)}
												</div>
											</div>
										</div>
									</div>
								))}
								<div ref={messagesEndRef} />
							</div>
						</ScrollArea>

						{/* Suggested Responses - Updated UI */}
						{suggestedResponses.length > 0 && (
							<div className="border-t pt-3">
								<div className="text-sm text-gray-500 mb-2">Quick Replies:</div>
								<div className="flex flex-wrap gap-2">
									{suggestedResponses.map((suggestion, index) => (
										<Button
											key={index}
											variant="outline"
											size="sm"
											onClick={(e) => handleSubmit(e, suggestion)}
											className="text-xs bg-white hover:bg-blue-50 border-blue-200 text-blue-700">
											{suggestion}
										</Button>
									))}
								</div>
							</div>
						)}

						<form onSubmit={handleSubmit} className="flex gap-2 pt-3">
							<Input
								placeholder={
									suggestedResponses.length > 0
										? "Choose a quick reply above or type your answer..."
										: "Type your message..."
								}
								value={userInput}
								onChange={(e) => setUserInput(e.target.value)}
								disabled={loading}
								className="flex-1"
							/>
							<Button
								type="submit"
								disabled={loading}
								className="bg-blue-600 hover:bg-blue-700">
								{loading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Thinking...
									</>
								) : (
									<Send className="h-4 w-4" />
								)}
							</Button>
						</form>
					</div>
				</div>

				<div className="space-y-4">
					{keywords.length > 0 && (
						<Tabs defaultValue="cards" className="w-full">
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="cards">Detailed View</TabsTrigger>
								<TabsTrigger value="list">Copyable List</TabsTrigger>
							</TabsList>

							<TabsContent value="cards" className="mt-4">
								<div className="space-y-3">
									<div className="flex justify-between items-center">
										<h2 className="text-xl font-semibold">
											Suggested Keywords
										</h2>
										<Button
											variant="outline"
											size="sm"
											onClick={() => copyAllKeywords("detailed")}
											className="text-xs">
											Copy All Details
										</Button>
									</div>
									<ScrollArea className="h-[500px]">
										<div className="space-y-3 pr-4">
											{keywords?.length > 0 ? (
												keywords.map((result: KeywordResult, index) => (
													<div key={index} className="space-y-3">
														<h3 className="font-semibold text-lg">
															Seed Keyword: {result.seed_keyword}
														</h3>
														{result.items?.map((item, itemIndex) => (
															<Card
																key={`${index}-${itemIndex}`}
																className="p-4">
																<div className="flex justify-between items-start">
																	<div className="flex-1">
																		<div className="flex items-center justify-between">
																			<h3 className="font-semibold mb-2">
																				{item.keyword_data.keyword}
																			</h3>
																			<Button
																				variant="ghost"
																				size="sm"
																				onClick={() =>
																					handleCopyKeyword(
																						item.keyword_data.keyword,
																						itemIndex
																					)
																				}
																				className="h-8 w-8 p-0">
																				{copiedIndex === itemIndex ? (
																					<Check className="h-4 w-4" />
																				) : (
																					<Copy className="h-4 w-4" />
																				)}
																			</Button>
																		</div>
																		<div className="text-sm text-gray-600 space-y-1">
																			<div className="grid grid-cols-3 gap-2">
																				<div className="bg-gray-50 p-2 rounded">
																					<p className="font-medium">
																						Search Volume
																					</p>
																					<p>
																						{item.keyword_data.keyword_info.search_volume?.toLocaleString() ||
																							"0"}
																					</p>
																				</div>
																				<div className="bg-gray-50 p-2 rounded">
																					<p className="font-medium">
																						Competition
																					</p>
																					<p>
																						{item.keyword_data.keyword_info
																							.competition_level || "Unknown"}
																					</p>
																				</div>
																				<div className="bg-gray-50 p-2 rounded">
																					<p className="font-medium">CPC</p>
																					<p>
																						$
																						{item.keyword_data.keyword_info.cpc?.toFixed(
																							2
																						) || "0.00"}
																					</p>
																				</div>
																			</div>
																			{item.related_keywords?.length > 0 && (
																				<div className="mt-3">
																					<p className="font-medium mb-1">
																						Related Keywords:
																					</p>
																					<div className="flex flex-wrap gap-1">
																						{item.related_keywords
																							.slice(0, 3)
																							.map((related, idx) => (
																								<span
																									key={idx}
																									className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
																									{related}
																								</span>
																							))}
																						{item.related_keywords.length >
																							3 && (
																							<span className="text-xs text-gray-500">
																								+
																								{item.related_keywords.length -
																									3}{" "}
																								more
																							</span>
																						)}
																					</div>
																				</div>
																			)}
																		</div>
																	</div>
																</div>
															</Card>
														))}
													</div>
												))
											) : (
												<div className="text-center text-gray-500 py-4">
													No keywords found. Try searching for something!
												</div>
											)}
										</div>
									</ScrollArea>
								</div>
							</TabsContent>

							<TabsContent value="list" className="mt-4">
								<div className="space-y-3">
									<div className="flex justify-between items-center">
										<h2 className="text-xl font-semibold">Keyword List</h2>
										<Button
											variant="outline"
											size="sm"
											onClick={() => copyAllKeywords("simple")}
											className="text-xs">
											Copy All Keywords
										</Button>
									</div>
									<Card className="p-4">
										<ScrollArea className="h-[500px]">
											<div className="space-y-2">
												{keywords?.length > 0 ? (
													keywords.map((result: KeywordResult, index) => (
														<div key={index} className="space-y-2">
															<h3 className="font-semibold text-lg">
																Seed Keyword: {result.seed_keyword}
															</h3>
															{result.items?.map((item, itemIndex) => (
																<div
																	key={`${index}-${itemIndex}`}
																	className="flex justify-between items-center py-2 hover:bg-gray-50 px-2 rounded">
																	<div>
																		<div className="flex items-center gap-2">
																			<span className="font-medium">
																				{item.keyword_data.keyword}
																			</span>
																		</div>
																		<span className="text-sm text-gray-500 ml-2">
																			{item.keyword_data.keyword_info.search_volume?.toLocaleString() ||
																				"0"}{" "}
																			searches/mo
																		</span>
																	</div>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() =>
																			handleCopyKeyword(
																				item.keyword_data.keyword,
																				itemIndex + result.items.length
																			)
																		}
																		className="h-8 w-8 p-0">
																		{copiedIndex ===
																		itemIndex + result.items.length ? (
																			<Check className="h-4 w-4" />
																		) : (
																			<Copy className="h-4 w-4" />
																		)}
																	</Button>
																</div>
															))}
														</div>
													))
												) : (
													<div className="text-center text-gray-500 py-4">
														No keywords found. Try searching for something!
													</div>
												)}
											</div>
										</ScrollArea>
									</Card>
								</div>
							</TabsContent>
						</Tabs>
					)}
				</div>
			</div>
		</div>
	);
}
