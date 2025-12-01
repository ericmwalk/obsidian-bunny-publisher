// src/alttext/PerplexityAltTextProvider.ts
import { requestUrl } from "obsidian";
import type { AltTextProvider, AltTextRequest } from "./alttextprovider";

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
        "Authorization": `Bearer ${this.apiKey}`,
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
                text: request.prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        temperature: 0.0
      })
    });

    const json: any = response.json;
    const output =
      json?.choices?.[0]?.message?.content ??
      json?.choices?.[0]?.text ??
      "";

    return typeof output === "string" ? output.trim() : "";
  }
}
