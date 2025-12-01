// src/alttext/GeminiAltTextProvider.ts
import { requestUrl } from "obsidian";
import type { AltTextProvider, AltTextRequest } from "./alttextprovider";

export class GeminiAltTextProvider implements AltTextProvider {
  private apiKey: string;
  private model: string;

// might have to figure out in the future how to make this so you can change it going forward
  constructor(apiKey: string, model: string = "gemini-2.0-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateAltText(req: AltTextRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Gemini API key not configured.");
    }

    // ✔ Correct Gemini v1 endpoint
    const url = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await requestUrl({
      url,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },

      // ✔ Correct Gemini v1 request body
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

    const data: any = response.json;
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts;

    if (Array.isArray(parts)) {
      // Combine text parts
      const text = parts
        .map((p: any) => p.text)
        .filter((t: any) => typeof t === "string")
        .join(" ")
        .trim();

      return text;
    }

    return "";
  }
}
