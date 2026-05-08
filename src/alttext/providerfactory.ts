// src/ai/ProviderFactory.ts

import type { BunnySettings, AIProviderType } from "../settings";
import type { AltTextProvider } from "./alttextprovider";
import { OpenAIAltTextProvider } from "./openaialttextprovider";
import { GeminiAltTextProvider } from "./geminialttextprovider";
import { ClaudeAltTextProvider } from "./claudealttextprovider";
import { PerplexityAltTextProvider } from "./perplexityalttextprovider";

export function createAltTextProvider(
  settings: BunnySettings
): AltTextProvider | null {
  const provider: AIProviderType = settings.aiProvider ?? "openai";

  if (provider === "none") {
    return null;
  }

  if (provider === "openai") {
    if (!settings.openaiKey) return null;
    return new OpenAIAltTextProvider(settings.openaiKey, settings.openaiModel || undefined);
  }

  if (provider === "gemini") {
    if (!settings.geminiKey) return null;
    return new GeminiAltTextProvider(settings.geminiKey, settings.geminiModel || undefined);
  }

  if (provider === "claude") {
    if (!settings.claudeKey) return null;
    return new ClaudeAltTextProvider(settings.claudeKey, settings.claudeModel || undefined);
  }

  if (provider === "perplexity") {
    if (!settings.perplexityKey) return null;
    return new PerplexityAltTextProvider(settings.perplexityKey, settings.perplexityModel || undefined);
  }

  return null;
}
