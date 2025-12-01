// src/alttext/AltTextGenerator.ts
import { App, Notice, TFile } from "obsidian";
import type { BunnySettings } from "../settings";
import { createAltTextProvider } from "./providerfactory";
import type { AltTextRequest } from "./alttextprovider";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function guessMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".avif")) return "image/avif";
  return "image/*";
}

function filenameToAlt(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, "");
  return withoutExt
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Main helper used by the plugin to generate alt text for a given TFile.
 * Uses the configured AI provider (OpenAI / Gemini), with filename fallback.
 */
export async function generateAltTextForFile(
  app: App,
  settings: BunnySettings,
  file: TFile
): Promise<string> {
  // Fallback alt text if AI is disabled or fails
  const fallback = filenameToAlt(file.name || "image");

  if (!settings.useAiAltText) {
    return fallback;
  }

  const provider = createAltTextProvider(settings);
  if (!provider) {
    // No provider configured (e.g., no key, or "none")
    return fallback;
  }

  try {
    const buffer = await app.vault.readBinary(file);
    const base64 = arrayBufferToBase64(buffer);
    const mimeType = guessMimeType(file.name);

    const request: AltTextRequest = {
      imageBase64: base64,
      mimeType,
      filename: file.name,
      prompt: "Provide a clear, concise alt text (max 1 sentence) describing this image.",
    };

    const result = await provider.generateAltText(request);
    const cleaned = result?.trim();

    if (!cleaned) return fallback;
    return cleaned;
  } catch (error) {
    console.error("AI alt text generation failed:", error);
    new Notice("AI alt text failed – using filename instead.");
    return fallback;
  }
}
