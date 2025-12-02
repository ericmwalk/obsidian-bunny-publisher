// src/alttext/PerplexityAltTextProvider.ts
import { requestUrl } from "obsidian";
import type { AltTextProvider, AltTextRequest } from "./alttextprovider";

interface PerplexityMessageContentPart {
  type: string;
  text?: string;
  image_url?: {
    url: string;
  };
}

interface PerplexityChoice {
  message?: {
    content?: string | PerplexityMessageContentPart[];
  };
  text?: string;
}

interface PerplexityResponse {
  choices?: PerplexityChoice[];
}

export class PerplexityAltTextProvider implements AltTextProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "sonar") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateAltText(request: AltTextRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Perplexity API key not configured.");
    }

    const dataUrl = `data:${request.mimeType};base64,${request.imageBase64}`;

    const response = await requestUrl({
      url: "https://api.perplexity.ai/chat/completions",
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
              {
                type: "text",
                text: request.prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.0,
      }),
    });

    // Safe: treat as unknown, then validate before casting
    const raw = response.json as unknown;

    if (typeof raw !== "object" || raw === null || !("choices" in raw)) {
      return "";
    }

    const typed = raw as PerplexityResponse;
    const choice = typed.choices?.[0];

    // Prefer message.content → then fallback to text
    const content = choice?.message?.content ?? choice?.text ?? "";

    if (typeof content === "string") {
      return content.trim();
    }

    // If Perplexity returned a structured content array
    if (Array.isArray(content)) {
      const textPart = content.find(
        (part): part is PerplexityMessageContentPart =>
          typeof part === "object" &&
          part !== null &&
          part.type === "text" &&
          typeof part.text === "string"
      );

      if (textPart?.text) {
        return textPart.text.trim();
      }
    }

    return "";
  }
}
