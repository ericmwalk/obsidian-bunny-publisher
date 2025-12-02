// src/alttext/GeminiAltTextProvider.ts
import { requestUrl } from "obsidian";
import type { AltTextProvider, AltTextRequest } from "./alttextprovider";

interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiContentPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export class GeminiAltTextProvider implements AltTextProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gemini-2.0-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateAltText(req: AltTextRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Gemini API key not configured.");
    }

    const url = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await requestUrl({
      url,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: req.prompt },
              {
                inlineData: {
                  mimeType: req.mimeType,
                  data: req.imageBase64
                }
              }
            ]
          }
        ]
      })
    });

    // No "any": first treat as unknown, then narrow safely.
    const data = response.json as unknown;

    if (
      typeof data !== "object" ||
      data === null ||
      !("candidates" in data)
    ) {
      return "";
    }

    const typed = data as GeminiResponse;
    const candidate = typed.candidates?.[0];
    const parts = candidate?.content?.parts;

    if (!Array.isArray(parts)) return "";

    const text = parts
      .map((p) => p.text)
      .filter((t): t is string => typeof t === "string")
      .join(" ")
      .trim();

    return text;
  }
}
