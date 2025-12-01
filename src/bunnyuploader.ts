import { requestUrl, TFile, App } from "obsidian";
import { BunnySettings } from "./settings";

// helper for dynamic upload locations by date {{YYYY}}, {{MM}}, {{DD}}
function expandDateTokens(path: string): string {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return path
    .replaceAll("{{YYYY}}", yyyy)
    .replaceAll("{{MM}}", mm)
    .replaceAll("{{DD}}", dd);
}


function sanitizeFilename(name: string): string {
  // Lets not be animals and this will replace spaces and invalid characters with dashes
  return name
    .trim()
    .replace(/\s+/g, "-")         // spaces → dash
    .replace(/[^a-zA-Z0-9._-]/g, "") // remove other unsafe symbols
    .replace(/-+/g, "-");         // collapse multiple dashes
}

// core upload function
export async function uploadToBunny(app: App, file: TFile, settings: BunnySettings): Promise<string> {
  const arrayBuffer = await app.vault.readBinary(file);

  const safeName = sanitizeFilename(file.name);
  if (safeName !== file.name) {
    console.log(`Sanitized filename: "${file.name}" → "${safeName}"`);
  }

  // expand date in uploadPath
  const expandedPath = expandDateTokens(settings.uploadPath);
  const folderPath = expandedPath;

  const uploadUrl = `https://${settings.storageHostname}/${settings.storageZoneName}/${folderPath}/${safeName}`;

//  For testing
//  console.log("Uploading to:", uploadUrl);

  const response = await requestUrl({
    url: uploadUrl,
    method: "PUT",
    headers: {
      "AccessKey": settings.apiKey,
      "Content-Type": "application/octet-stream"
    },
    body: arrayBuffer
  });

  if (response.status >= 200 && response.status < 300) {
    const cdnUrl = `https://${settings.cdnHostname}/${folderPath}/${safeName}`;

      //Rename local file incase it will be retained
      if (safeName !== file.name) {
        const newPath = file.parent.path + "/" + safeName;
        await app.fileManager.renameFile(file, newPath);
        console.log(`Renamed local file: ${file.name} → ${safeName}`);
    }

    return cdnUrl;
  } else {
    throw new Error(`Upload failed (${response.status}): ${response.text}`);
  }


}
