import { requestUrl } from "obsidian";
import type { AltTextProvider, AltTextRequest } from "./alttextprovider";

interface ClaudeContentBlock {
  type: string;
  text?: string;
}

interface ClaudeResponse {
  content?: ClaudeContentBlock[];
}

export class ClaudeAltTextProvider implements AltTextProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "claude-haiku-4-5-20251001") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateAltText(req: AltTextRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Anthropic API key not configured.");
    }

    const response = await requestUrl({
      url: "https://api.anthropic.com/v1/messages",
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: req.mimeType,
                  data: req.imageBase64,
                },
              },
              {
                type: "text",
                text: req.prompt,
              },
            ],
          },
        ],
      }),
    });

    const data = response.json as unknown;

    if (
      typeof data !== "object" ||
      data === null ||
      !("content" in data)
    ) {
      return "";
    }

    const typed = data as ClaudeResponse;
    const textBlock = typed.content?.find(
      (b): b is ClaudeContentBlock & { text: string } =>
        b.type === "text" && typeof b.text === "string"
    );

    return textBlock?.text?.trim() ?? "";
  }
}
