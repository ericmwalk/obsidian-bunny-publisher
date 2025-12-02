// src/alttext/OpenAIAltTextProvider.ts
import { requestUrl } from "obsidian";
import type { AltTextProvider, AltTextRequest } from "./alttextprovider";

interface OpenAIMessageContentPart {
  type: string;
  text?: string;
  image_url?: {
    url: string;
  };
}

interface OpenAIChoice {
  message?: {
    content?: string | OpenAIMessageContentPart[];
  };
}

interface OpenAIResponse {
  choices?: OpenAIChoice[];
}

export class OpenAIAltTextProvider implements AltTextProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateAltText(req: AltTextRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured.");
    }

    const response = await requestUrl({
      url: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: req.prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${req.mimeType};base64,${req.imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 80,
      }),
    });

    // No "any": narrow from unknown to our typed response
    const data = response.json as unknown;

    if (
      typeof data !== "object" ||
      data === null ||
      !("choices" in data)
    ) {
      return "";
    }

    const typed = data as OpenAIResponse;
    const choice = typed.choices?.[0];
    const content = choice?.message?.content;

    // Case 1: content is array of structured parts
    if (Array.isArray(content)) {
      const textPart = content.find(
        (p): p is OpenAIMessageContentPart =>
          typeof p === "object" && p !== null && p.type === "text"
      );
      if (textPart?.text) return textPart.text.trim();
    }

    // Case 2: content is a plain string
    if (typeof content === "string") {
      return content.trim();
    }

    return "";
  }
}
