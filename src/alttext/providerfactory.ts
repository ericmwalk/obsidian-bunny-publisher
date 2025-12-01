// src/ai/ProviderFactory.ts

import type { BunnySettings, AIProviderType } from "../settings";
import type { AltTextProvider } from "./alttextprovider";
import { OpenAIAltTextProvider } from "./openaialttextprovider";
import { GeminiAltTextProvider } from "./geminialttextprovider";
import { PerplexityAltTextProvider } from "./perplexityalttextprovider";


export function createAltTextProvider(settings: BunnySettings): AltTextProvider | null {
  const provider: AIProviderType = settings.aiProvider ?? "openai";

  if (provider === "none") return null;

  if (provider === "openai") {
    if (!settings.openaiKey) return null;
    return new OpenAIAltTextProvider(settings.openaiKey);
  }

  if (provider === "gemini") {
    if (!settings.geminiKey) return null;
    return new GeminiAltTextProvider(settings.geminiKey);
  }

  if (provider === "perplexity") {
    if (!settings.perplexityKey) return null;
    return new PerplexityAltTextProvider(settings.perplexityKey);
  }


  return null;
}
