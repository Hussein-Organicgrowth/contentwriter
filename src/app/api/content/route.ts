import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || "",
});

type ContentOperationType = "add" | "update" | "delete" | "expand";

interface ContentOperation {
  type: ContentOperationType;
  content: string;
  context?: string;
  targetSection?: string;
}

interface PlacementResponse {
  position: "before" | "after" | "replace";
  target: string;
  explanation: string;
}

function cleanJsonResponse(text: string): string {
  // Remove any markdown code block syntax
  text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  // Remove any leading/trailing whitespace
  text = text.trim();
  return text;
}

// Helper function to find and replace section content
function replaceSectionContent(
  content: string,
  targetSection: string,
  newContent: string
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/html");

  // Find the target section
  const elements = doc.querySelectorAll("h1, h2, h3, h4, h5, h6, p");
  let targetElement: Element | null = null;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element.textContent?.trim() === targetSection.trim()) {
      targetElement = element;
      break;
    }
  }

  if (!targetElement) {
    console.log("Target section not found, appending to end");
    // If section not found, append to the end
    const body = doc.querySelector("body");
    if (body) {
      const newSection = doc.createElement("div");
      newSection.innerHTML = newContent;
      body.appendChild(newSection);
    }
    return doc.body.innerHTML;
  }

  // Find the next heading or end of document
  let nextHeading: Element | null = null;
  let currentElement = targetElement.nextElementSibling;

  while (currentElement) {
    if (currentElement.tagName.match(/^H[1-6]$/)) {
      nextHeading = currentElement;
      break;
    }
    currentElement = currentElement.nextElementSibling;
  }

  // Create a new div for the expanded content
  const newSection = doc.createElement("div");
  newSection.innerHTML = newContent;

  // Insert the new content
  if (nextHeading) {
    targetElement.parentNode?.insertBefore(newSection, nextHeading);
  } else {
    targetElement.parentNode?.appendChild(newSection);
  }

  return doc.body.innerHTML;
}

export async function POST(req: Request) {
  try {
    const { operation, currentContent } = await req.json();
    console.log("Received request:", { operation, currentContent });

    if (!operation || !currentContent) {
      return NextResponse.json(
        { error: "Operation and current content are required" },
        { status: 400 }
      );
    }

    // For expand operations, we don't need placement analysis
    if (operation.type === "expand") {
      const contentPrompt = `You are a content expander. Given the following section and context, expand it while maintaining its style and meaning.

Section to Expand:
${operation.targetSection}

Context:
${operation.context || "No specific context provided"}

User Request:
${operation.content}

Generate an expanded version of the section that:
1. Maintains the original meaning and style
2. Adds more detail and depth
3. Keeps the same structure and formatting
4. Is 2-3 times longer than the original
5. Preserves any existing HTML formatting

Return only the expanded content, without any additional formatting or explanations.`;

      console.log("Sending content prompt:", contentPrompt);
      const contentResponse = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: contentPrompt,
      });

      if (!contentResponse.text) {
        throw new Error("Failed to generate content");
      }

      console.log("Content response:", contentResponse.text);
      const generatedContent = contentResponse.text;

      // Replace the section content
      const processedContent = replaceSectionContent(
        currentContent,
        operation.targetSection,
        generatedContent
      );

      return NextResponse.json({
        content: processedContent,
        placement: {
          position: "replace",
          target: operation.targetSection,
          explanation: "Expanded existing section",
        },
        operationType: operation.type,
      });
    }

    // For other operations, use the existing placement analysis
    const placementPrompt = `You are a content placement analyzer. Given the following content and operation, determine where the content should be placed or updated.

Current Content:
${currentContent}

Requested Operation:
${JSON.stringify(operation)}

Return ONLY a JSON object with this exact structure:
{
  "position": "before" | "after" | "replace",
  "target": "section identifier or text to replace",
  "explanation": "brief explanation of the placement decision"
}

Do not include any markdown formatting or additional text. Return only the JSON object.`;

    console.log("Sending placement prompt:", placementPrompt);
    const placementResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: placementPrompt,
    });

    if (!placementResponse.text) {
      throw new Error("Failed to get placement response");
    }

    console.log("Placement response:", placementResponse.text);

    // Clean and parse the JSON response
    const cleanedJson = cleanJsonResponse(placementResponse.text);
    console.log("Cleaned JSON:", cleanedJson);

    let placement: PlacementResponse;
    try {
      placement = JSON.parse(cleanedJson);
      console.log("Parsed placement:", placement);
    } catch (error) {
      console.error("Failed to parse placement response:", cleanedJson);
      throw new Error("Invalid placement response format");
    }

    // Validate the placement response
    if (!placement.position || !placement.target || !placement.explanation) {
      throw new Error("Invalid placement response structure");
    }

    // Then, generate the actual content
    let contentPrompt = "";

    if (operation.type === "add") {
      contentPrompt = `You are a content generator. Given the following context and operation, generate appropriate content.

Context:
${operation.context || "No specific context provided"}

Operation:
${JSON.stringify(operation)}

Generate well-structured, clear content that maintains the style of the existing content. Return only the content, without any additional formatting or explanations.`;
    } else {
      contentPrompt = `You are a content generator. Given the following context and operation, generate appropriate content.

Context:
${operation.context || "No specific context provided"}

Operation:
${JSON.stringify(operation)}

Generate well-structured, clear content that maintains the style of the existing content. Return only the content, without any additional formatting or explanations.`;
    }

    console.log("Sending content prompt:", contentPrompt);
    const contentResponse = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contentPrompt,
    });

    if (!contentResponse.text) {
      throw new Error("Failed to generate content");
    }

    console.log("Content response:", contentResponse.text);
    const generatedContent = contentResponse.text;

    // Process the content based on the operation type
    let processedContent = generatedContent;
    console.log("Processing content for operation type:", operation.type);

    if (operation.type === "add") {
      processedContent = ensureHtmlStructure(processedContent);
      console.log("Processed content after HTML structure:", processedContent);
    } else if (operation.type === "update" || operation.type === "expand") {
      processedContent = maintainStructure(processedContent, currentContent);
      console.log(
        "Processed content after structure maintenance:",
        processedContent
      );
    } else if (operation.type === "delete") {
      processedContent = removeTargetContent(currentContent, placement.target);
      console.log("Processed content after removal:", processedContent);
    }

    const response = {
      content: processedContent,
      placement,
      operationType: operation.type,
    };

    console.log("Final response:", response);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error processing content operation:", error);
    return NextResponse.json(
      {
        error: "Failed to process content operation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to ensure proper HTML structure
function ensureHtmlStructure(content: string): string {
  // Add basic HTML structure if missing
  if (!content.includes("<p>") && !content.includes("<h")) {
    return `<p>${content}</p>`;
  }
  return content;
}

// Helper function to maintain existing structure
function maintainStructure(
  newContent: string,
  existingContent: string
): string {
  // Extract the structure from existing content
  const parser = new DOMParser();
  const existingDoc = parser.parseFromString(existingContent, "text/html");
  const newDoc = parser.parseFromString(newContent, "text/html");

  // Copy relevant structure from existing content
  const existingStructure = existingDoc.querySelector("body")?.innerHTML || "";
  const newStructure = newDoc.querySelector("body")?.innerHTML || "";

  // Merge structures while maintaining the new content
  return existingStructure.replace(/<p>.*?<\/p>/g, newStructure);
}

// Helper function to remove target content
function removeTargetContent(content: string, target: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/html");

  // Find and remove the target element
  const elements = doc.querySelectorAll("h1, h2, h3, h4, h5, h6, p");
  elements.forEach((element) => {
    if (element.textContent?.includes(target)) {
      element.remove();
    }
  });

  return doc.body.innerHTML;
}
