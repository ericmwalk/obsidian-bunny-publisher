// src/alttext/OpenAIAltTextProvider.ts
import { requestUrl } from "obsidian";
import type { AltTextProvider, AltTextRequest } from "./alttextprovider";

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
        "Authorization": `Bearer ${this.apiKey}`,
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
                  // Use inline base64 so this works regardless of hosting
                  url: `data:${req.mimeType};base64,${req.imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 80,
      }),
    });

    const data: any = response.json;
    const content = data?.choices?.[0]?.message?.content;

    if (Array.isArray(content) && content.length > 0) {
      const textPart = content.find((p: any) => p.type === "text");
      if (textPart?.text) return textPart.text.trim();
    }

    if (typeof content === "string") {
      return content.trim();
    }

    return "";
  }
}
