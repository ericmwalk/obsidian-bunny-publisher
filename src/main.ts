import { Plugin, Notice, TFile, MarkdownView } from "obsidian";
import { BunnySettings, BunnySettingTab, DEFAULT_SETTINGS } from "./settings";
import { uploadToBunny } from "./bunnyuploader";
import { generateAltTextForFile, generateAltTextForUrl } from "./alttext/alttextgenerator";

export default class BunnyPublisherPlugin extends Plugin {
  settings: BunnySettings;

  async onload() {
    await this.loadSettings();

    console.debug("🐇 Bunny Publisher onload triggered");

    this.addRibbonIcon(
      "rabbit",
      "Upload embedded images to Bunny.net",
      async () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) {
          new Notice("Open a Markdown note to upload embedded images.");
          return;
        }

        const editor = view.editor;
        const content = editor.getValue();

        // Match Obsidian embeds
        const matches = [...content.matchAll(/!\[\[(.*?)\]\]/g)];

        if (matches.length === 0) {
          new Notice("No embedded images found in this note.");
          return;
        }

        const total = matches.length;
        // Persistent notice (duration 0 = stays open) updated in place so
        // progress is always visible instead of individual toasts coming and going.
        const progress = new Notice("", 0);

        let updated = content;
        let uploadCount = 0;
        let deletedCount = 0;
        let failCount = 0;

        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const filename = match[1];
          const step = `${i + 1}/${total}`;

          console.debug("Found embed:", filename);

          const file = this.app.metadataCache.getFirstLinkpathDest(
            filename,
            view.file.path
          );

          if (!(file instanceof TFile)) {
            console.warn("Skipping invalid TFile:", filename);
            continue;
          }

          const isImage = /(png|jpg|jpeg|gif|webp)$/i.test(file.extension);
          const isVideo = /(mp4|mov|webm)$/i.test(file.extension);

          if (!isImage && !isVideo) {
            console.warn("Skipping unsupported file type:", file.extension);
            continue;
          }

          try {
            progress.setMessage(`Uploading ${step}: ${file.name}…`);

            // Upload to Bunny
            const cdnUrl = await uploadToBunny(this.app, file, this.settings);
            uploadCount++;

            let replacement = "";

            /* -------------------------------------------------
             * IMAGE HANDLING
             * ------------------------------------------------- */
            if (isImage) {
              let alt = "";

              if (this.settings.useAiAltText) {
                try {
                  progress.setMessage(`Generating alt text ${step}: ${file.name}…`);
                  alt = await generateAltTextForFile(
                    this.app,
                    this.settings,
                    file
                  );
                } catch (err) {
                  console.error("AI alt text failed:", err);
                  // Let alt remain empty; you could fall back to filename if preferred.
                }
              }

              replacement = `![${alt}](${cdnUrl})`;
            }

            /* -------------------------------------------------
             * VIDEO HANDLING
             * ------------------------------------------------- */
            else if (isVideo) {
              replacement = `<video controls src="${cdnUrl}" style="max-width:100%;border-radius:8px;"></video>`;
            }

            // Replace the original embed with the new markdown
            updated = updated.replace(match[0], replacement);

            // Optional delete
            if (this.settings.deleteAfterUpload) {
              await this.app.vault.delete(file);
              deletedCount++;
            }
          } catch (e) {
            failCount++;

            console.error("Upload failed for", filename, e);
            progress.setMessage(`Failed ${step}: ${filename} — continuing…`);
          }
        }

        // Update note contents with replaced embeds
        editor.setValue(updated);

        progress.hide();

        /* -------------------------------------------------
         * SUMMARY NOTICE
         * ------------------------------------------------- */
        let summary = `Uploaded ${uploadCount} file${
          uploadCount !== 1 ? "s" : ""
        }`;

        if (deletedCount > 0) summary += ` • deleted ${deletedCount}`;
        if (failCount > 0) summary += ` • failed ${failCount}`;

        summary += ".";

        new Notice(summary);
      }
    );

    this.addCommand({
      id: "bunny-fill-missing-alt-text",
      name: "Add alt text to images missing it",
      callback: () => this.fillMissingAltText(),
    });

    this.addSettingTab(new BunnySettingTab(this.app, this));
  }

  private async fillMissingAltText() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      new Notice("Open a Markdown note to add alt text.");
      return;
    }

    if (!this.settings.cdnHostname) {
      new Notice("Set a CDN hostname in Bunny Publisher settings first.");
      return;
    }

    const editor = view.editor;
    const content = editor.getValue();

    const hostEscaped = this.settings.cdnHostname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const imageRegex = new RegExp(
      `!\\[\\]\\((https?:\\/\\/${hostEscaped}\\/[^)\\s]+)\\)`,
      "g"
    );
    const matches = [...content.matchAll(imageRegex)];

    if (matches.length === 0) {
      new Notice("No images missing alt text found.");
      return;
    }

    const total = matches.length;
    const progress = new Notice("", 0);

    let updated = content;
    let filled = 0;
    let failed = 0;

    for (let i = 0; i < matches.length; i++) {
      const url = matches[i][1];
      const step = `${i + 1}/${total}`;
      const label = decodeURIComponent(url.split("/").pop()?.split("?")[0] || url);

      try {
        progress.setMessage(`Alt text ${step}: ${label}…`);
        const alt = await generateAltTextForUrl(this.settings, url);
        updated = updated.replace(`![](${url})`, `![${alt}](${url})`);
        filled++;
      } catch (e) {
        failed++;
        console.error("Alt text fill failed for", url, e);
        progress.setMessage(`Failed ${step}: ${label} — continuing…`);
      }
    }

    editor.setValue(updated);

    progress.hide();

    let summary = `Filled alt text for ${filled} image${filled !== 1 ? "s" : ""}`;
    if (failed > 0) summary += ` • failed ${failed}`;
    summary += ".";

    new Notice(summary);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
