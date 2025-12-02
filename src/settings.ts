import { PluginSettingTab, Setting, App, setIcon } from "obsidian";
import type BunnyPublisherPlugin from "../main";

export type AIProviderType = "openai" | "gemini" | "perplexity" | "none";

export interface BunnySettings {
  storageZoneName: string;
  apiKey: string;
  uploadPath: string;
  cdnHostname: string;
  deleteAfterUpload: boolean;
  storageHostname: string;
  useAiAltText: boolean;
  aiProvider: AIProviderType;
  openaiKey: string;
  geminiKey: string;
  perplexityKey: string;
}

export const DEFAULT_SETTINGS: BunnySettings = {
  storageZoneName: "",
  apiKey: "",
  uploadPath: "",
  cdnHostname: "",
  deleteAfterUpload: false,
  storageHostname: "storage.bunnycdn.com",
  useAiAltText: false,
  aiProvider: "openai",
  openaiKey: "",
  geminiKey: "",
  perplexityKey: "",
};

export class BunnySettingTab extends PluginSettingTab {
  plugin: BunnyPublisherPlugin;

  constructor(app: App, plugin: BunnyPublisherPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Upload configuration")
      .setHeading();

    /* ------------------------------------------------------------------
     * Helper to add an input with an "eye" toggle
     * ------------------------------------------------------------------ */
    const addMaskedInput = (
      parent: Setting,
      getter: () => string,
      setter: (value: string) => Promise<void>
    ) => {
      parent.addText((text) => {
        text
          .setPlaceholder("•••••••")
          .setValue(getter())
          .onChange(async (value) => {
            await setter(value.trim());
          });

        // Start hidden
        text.inputEl.type = "password";

        // Eye toggle
        const eyeIcon = text.inputEl.parentElement?.createEl("div", {
          cls: "bunny-eye-toggle clickable-icon",
        });

        if (eyeIcon) {
          setIcon(eyeIcon, "eye");

          let visible = false;
          eyeIcon.onclick = () => {
            visible = !visible;
            text.inputEl.type = visible ? "text" : "password";
            setIcon(eyeIcon, visible ? "eye-off" : "eye");
          };

          text.inputEl.parentElement?.appendChild(eyeIcon);
        }
      });
    };

    /* ------------------------------------------------------------------
     * BASIC BUNNY SETTINGS
     * ------------------------------------------------------------------ */

    new Setting(containerEl)
      .setName("Storage zone name")
      .addText((t) =>
        t
          .setPlaceholder("my-zone")
          .setValue(this.plugin.settings.storageZoneName)
          .onChange(async (v) => {
            this.plugin.settings.storageZoneName = v;
            await this.plugin.saveSettings();
          })
      );

    const bunnyKeySetting = new Setting(containerEl)
      .setName("Bunny.net access key")
      .setDesc(
        createFragment((frag) => {
          frag.appendText("Your Bunny.net API access key. ");
          frag.createEl("a", {
            href: "https://docs.bunny.net/reference/storage-api",
            text: "Learn more",
          });
        })
      );

    addMaskedInput(
      bunnyKeySetting,
      () => this.plugin.settings.apiKey || "",
      async (v) => {
        this.plugin.settings.apiKey = v;
        await this.plugin.saveSettings();
      }
    );

    new Setting(containerEl)
      .setName("Storage hostname")
      .setDesc("Use your region endpoint (e.g. ny.storage.bunnycdn.com).")
      .addText((t) =>
        t
          .setPlaceholder("storage.bunnycdn.com")
          .setValue(this.plugin.settings.storageHostname)
          .onChange(async (v) => {
            this.plugin.settings.storageHostname = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("CDN hostname")
      .setDesc(
        "Your custom Bunny CDN hostname (e.g. cdn.your-domain.com). If not using a custom domain, use {pullzone}.b-cdn.net."
      )
      .addText((t) =>
        t
          .setPlaceholder("cdn.yoursite.net")
          .setValue(this.plugin.settings.cdnHostname)
          .onChange(async (v) => {
            this.plugin.settings.cdnHostname = v;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Upload path")
      .setDesc(
        "You can use {{YYYY}} and {{MM}} for date-based folders (e.g. media/{{YYYY}}/{{MM}})."
      )
      .addText((t) =>
        t
          .setPlaceholder("images/2025")
          .setValue(this.plugin.settings.uploadPath)
          .onChange(async (v) => {
            this.plugin.settings.uploadPath = v;
            await this.plugin.saveSettings();
          })
      );

    /* ------------------------------------------------------------------
     * AI ALT TEXT SETTINGS
     * ------------------------------------------------------------------ */

    new Setting(containerEl)
      .setName("Use AI-generated alt text")
      .setDesc("Automatically generate alt text for uploaded images.")
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.useAiAltText)
          .onChange(async (value) => {
            this.plugin.settings.useAiAltText = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.useAiAltText) {
      new Setting(containerEl)
        .setName("AI provider")
        .setDesc("Choose which AI model to use for alt text generation.")
        .addDropdown((drop) => {
          drop.addOption("openai", "OpenAI (ChatGPT)");
          drop.addOption("gemini", "Google Gemini");
          drop.addOption("perplexity", "Perplexity");
          drop.addOption("none", "None (filename only)");

          drop
            .setValue(this.plugin.settings.aiProvider)
            .onChange(async (value) => {
              this.plugin.settings.aiProvider = value as AIProviderType;
              await this.plugin.saveSettings();
              this.display();
            });
        });

      /* ------------------------------
       * OPENAI KEY INPUT (masked)
       * ------------------------------ */
      if (this.plugin.settings.aiProvider === "openai") {
        const openaiSetting = new Setting(containerEl)
          .setName("OpenAI API key")
          .setDesc(
            createFragment((frag) => {
              frag.appendText("Used for generating alt text. ");
              frag.createEl("a", {
                href: "https://platform.openai.com/api-keys",
                text: "Get a key",
              });
            })
          );

        addMaskedInput(
          openaiSetting,
          () => this.plugin.settings.openaiKey,
          async (v) => {
            this.plugin.settings.openaiKey = v;
            await this.plugin.saveSettings();
          }
        );
      }

      /* ------------------------------
       * GEMINI KEY INPUT (masked)
       * ------------------------------ */
      if (this.plugin.settings.aiProvider === "gemini") {
        const geminiSetting = new Setting(containerEl)
          .setName("Gemini API key")
          .setDesc(
            createFragment((frag) => {
              frag.appendText("Used for Gemini alt text. ");
              frag.createEl("a", {
                href: "https://aistudio.google.com/app/apikey",
                text: "Get a key",
              });
            })
          );

        addMaskedInput(
          geminiSetting,
          () => this.plugin.settings.geminiKey,
          async (v) => {
            this.plugin.settings.geminiKey = v;
            await this.plugin.saveSettings();
          }
        );
      }

      /* ------------------------------
       * PERPLEXITY KEY INPUT (masked)
       * ------------------------------ */
      if (this.plugin.settings.aiProvider === "perplexity") {
        const perplexitySetting = new Setting(containerEl)
          .setName("Perplexity API key")
          .setDesc("Used for Perplexity alt-text generation.");

        addMaskedInput(
          perplexitySetting,
          () => this.plugin.settings.perplexityKey,
          async (v) => {
            this.plugin.settings.perplexityKey = v;
            await this.plugin.saveSettings();
          }
        );
      }
    }

    /* ------------------------------------------------------------------
     * DELETE LOCAL FILES TOGGLE
     * ------------------------------------------------------------------ */
    new Setting(containerEl)
      .setName("Delete local images after upload")
      .setDesc("Removes the original file after successful upload.")
      .addToggle((t) =>
        t
          .setValue(this.plugin.settings.deleteAfterUpload)
          .onChange(async (value) => {
            this.plugin.settings.deleteAfterUpload = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
