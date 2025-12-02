import { Plugin, Notice, TFile, MarkdownView } from "obsidian";
import { BunnySettings, BunnySettingTab, DEFAULT_SETTINGS } from "./settings";
import { uploadToBunny } from "./bunnyuploader";
import { generateAltTextForFile } from "./alttext/alttextgenerator";

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

        new Notice(`Uploading ${matches.length} file(s)…`);

        let updated = content;
        let uploadCount = 0;
        let deletedCount = 0;
        let failCount = 0;

        for (const match of matches) {
          const filename = match[1];

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
            new Notice(`Uploading ${file.name}…`);

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
                  new Notice(`Generating alt text for ${file.name}…`);
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

            const message =
              e instanceof Error ? e.message : "Unknown error during upload.";

            new Notice(`Failed to upload ${filename}: ${message}`);
          }
        }

        // Update note contents with replaced embeds
        editor.setValue(updated);

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

    this.addSettingTab(new BunnySettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
