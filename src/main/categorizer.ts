import type { WindowCategory } from "../shared/ipc-contract";

const FOCUS_BUNDLES = new Set([
  // Code editors & IDEs
  "com.microsoft.VSCode",
  "com.apple.dt.Xcode",
  "io.cursor.Cursor",
  "com.sublimetext.4",
  "dev.zed.Zed",
  "com.jetbrains.intellij",
  "com.jetbrains.webstorm",
  "com.jetbrains.pycharm",
  "com.jetbrains.goland",
  "com.jetbrains.clion",
  "com.jetbrains.rider",
  "com.jetbrains.datagrip",
  "com.jetbrains.rubymine",
  "com.jetbrains.appcode",
  "com.todesktop.230313mzl4w4u92", // Windsurf
  // Terminals
  "com.apple.Terminal",
  "com.googlecode.iterm2",
  "dev.warp.Warp",
  "com.mitchellh.ghostty",
  "com.alacritty.Alacritty",
  // Design
  "com.figma.Desktop",
  "com.sketch.sketch",
  "com.adobe.Photoshop",
  "com.adobe.illustrator",
  "com.adobe.InDesign",
  "com.adobe.Premiere",
  "com.adobe.AfterEffects",
  "com.adobe.AdobeXD",
  // Writing & notes
  "com.obsidian.md",
  "md.obsidian",
  "com.notion.id",
  "com.apple.Notes",
  "net.shinyfrog.bear",
  "com.ulyssesapp.mac",
  "com.adobe.Reader",
  "com.readdle.pdf-squeezer-4",
  // Office & docs
  "com.microsoft.Word",
  "com.microsoft.Excel",
  "com.microsoft.Powerpoint",
  "com.microsoft.OneNote",
  "com.apple.iWork.Pages",
  "com.apple.iWork.Numbers",
  "com.apple.iWork.Keynote",
  // Dev tools
  "com.github.GitHubDesktop",
  "com.apple.dt.Instruments",
  "com.postmanlabs.mac",
  "com.insomnia.app",
  "io.paw.mac",
  "com.tableplus.TablePlus",
  "com.sequelpro.SequelPro",
  "com.dbeaver.product",
  "com.tinyapp.TableFlip",
  "com.docker.docker",
  "com.virtualbox.app",
  "com.parallels.desktop",
  "com.apple.Simulator",
  // Task / project management
  "com.culturedcode.ThingsMac",
  "com.todoist.mac.Todoist",
  "com.linear.app",
  "io.linear",
  // Meetings (treated as focus — active work/class)
  "us.zoom.xos",
  "com.microsoft.teams",
  "com.microsoft.teams2",
  "com.loom.desktop",
]);

const FOCUS_NAME_RE =
  /\b(terminal|iterm|iterm2|ghostty|warp|alacritty|vs code|vscode|cursor|zed|xcode|webstorm|pycharm|intellij|android studio|sublime|obsidian|notion|bear|ulysses|word|excel|powerpoint|keynote|pages|numbers|onenote|figma|sketch|photoshop|illustrator|indesign|premiere|after effects|postman|insomnia|tableplus|sequel pro|dbeaver|docker|simulator|zoom|microsoft teams|loom|things|todoist|linear|github desktop|winsurf|windsurf|raycast)\b/i;

const DISTRACTION_BUNDLES = new Set([
  "com.hnc.Discord",
  "com.spotify.client",
  "com.apple.TV",
  "com.facebook.archon",
  "com.apple.Music",
  "com.whatsapp.WhatsApp",
  "ph.telegra.Telegraph",
]);

const DISTRACTION_NAME_RE =
  /\b(youtube|netflix|twitch|tiktok|instagram|twitter|x\.com|reddit|steam|epicgames|discord|prime video|primevideo|hulu|disney\+|disneyplus|peacock|facebook|snapchat|espn|crunchyroll|soundcloud|bandcamp|9gag|tumblr|pinterest|linkedin)\b/i;

const RESEARCH_BUNDLES = new Set([
  "com.google.Chrome",
  "org.mozilla.firefox",
  "com.apple.Safari",
  "com.microsoft.edgemac",
  "com.brave.Browser",
  "com.operasoftware.Opera",
  "company.thebrowser.Browser", // Arc
  "app.zen-browser.zen", // Zen Browser
  "com.vivaldi.Vivaldi",
  "com.kagi.kagimacOS", // Orion
  "com.apple.Preview",
  "com.readdle.PDFExpert",
  "com.pdfpen.pdfpen7",
]);

// Catches any unrecognized browser by app name — stops them falling through to 'unknown'
const RESEARCH_NAME_RE = /browser|navigator/i;

export function categorize(
  appName: string,
  bundleId: string,
  title: string,
): WindowCategory {
  if (FOCUS_BUNDLES.has(bundleId)) return "focus";
  if (DISTRACTION_BUNDLES.has(bundleId)) return "distraction";
  if (DISTRACTION_NAME_RE.test(appName)) return "distraction";
  // Title-based check catches YouTube/Reddit/etc open in any browser
  if (DISTRACTION_NAME_RE.test(title)) return "distraction";
  if (RESEARCH_BUNDLES.has(bundleId)) return "research";
  if (FOCUS_NAME_RE.test(appName)) return "focus";
  // Fallback: any app whose name contains "browser" is research
  if (RESEARCH_NAME_RE.test(appName)) return "research";
  return "unknown";
}
