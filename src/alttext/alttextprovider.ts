// src/alttext/AltTextProvider.ts

export interface AltTextRequest {
  imageBase64: string;
  mimeType: string;
  filename?: string;
  prompt: string;
}

export interface AltTextProvider {
  generateAltText(request: AltTextRequest): Promise<string>;
}
