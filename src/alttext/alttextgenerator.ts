// src/alttext/AltTextGenerator.ts
import { App, Notice, TFile, requestUrl } from "obsidian";
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
    .replace(/[_-]+/g, " ") // normalize separators
    .replace(/\s+/g, " ")   // collapse spaces
    .trim();
}

/**
 * Shared core: runs image bytes through the configured AI provider.
 * Falls back to a filename-derived description if AI is disabled, unconfigured, or fails.
 */
async function generateAltTextFromBytes(
  settings: BunnySettings,
  buffer: ArrayBuffer,
  filename: string
): Promise<string> {
  const fallback = filenameToAlt(filename || "image");

  if (!settings.useAiAltText) {
    return fallback;
  }

  const provider = createAltTextProvider(settings);
  if (!provider) {
    // No provider configured (e.g., no key, or "none")
    return fallback;
  }

  try {
    const base64 = arrayBufferToBase64(buffer);
    const mimeType = guessMimeType(filename);

    const request: AltTextRequest = {
      imageBase64: base64,
      mimeType,
      filename,
      prompt:
        "Provide a clear, concise alt text (max 1 sentence) describing this image.",
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

/**
 * Main helper used by the plugin to generate alt text for a given TFile.
 * Uses the configured AI provider (OpenAI / Gemini), with filename fallback.
 */
export async function generateAltTextForFile(
  app: App,
  settings: BunnySettings,
  file: TFile
): Promise<string> {
  const buffer = await app.vault.readBinary(file);
  return generateAltTextFromBytes(settings, buffer, file.name);
}

/**
 * Generates alt text for an image that's already been uploaded and is only
 * reachable by URL (e.g. the local vault copy was deleted after upload).
 */
export async function generateAltTextForUrl(
  settings: BunnySettings,
  url: string
): Promise<string> {
  const filename = decodeURIComponent(url.split("/").pop()?.split("?")[0] || "image");

  // Skip the network fetch entirely when AI alt text isn't configured.
  if (!settings.useAiAltText) {
    return filenameToAlt(filename);
  }

  try {
    const response = await requestUrl({ url, method: "GET" });
    return generateAltTextFromBytes(settings, response.arrayBuffer, filename);
  } catch (error) {
    console.error("Failed to fetch image for alt text:", error);
    new Notice(`Could not fetch ${filename} – using filename instead.`);
    return filenameToAlt(filename);
  }
}
