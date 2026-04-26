import type {
  ActivityCategory,
  ClassificationResult,
  ClassifyActivityInput,
  SessionCorrection,
  SessionType,
} from '../../shared/classificationTypes';

// ── Session type detection ─────────────────────────────────────────────────────

const SESSION_TYPE_KEYWORDS: Record<Exclude<SessionType, 'general'>, RegExp> = {
  coding:  /\b(code|coding|bug|fix|backend|frontend|react|typescript|javascript|electron|api|github|repo|merge|component|terminal|debug|deploy|function|algorithm|leetcode|hackathon|program)\b/i,
  writing: /\b(essay|speech|write|writing|outline|draft|paper|presentation|slides|paragraph|script|thesis|blog|article|report|document|memo)\b/i,
  study:   /\b(study|studying|homework|exam|quiz|notes|lecture|class|reading|textbook|assignment|canvas|course|chapter|flashcard|review|test)\b/i,
  design:  /\b(design|art|photoshop|figma|illustrator|drawing|logo|ui|ux|mockup|prototype|edit|sketch|wireframe|branding|icon|graphic)\b/i,
};

export function guessSessionType(goal: string): SessionType {
  for (const [type, pattern] of Object.entries(SESSION_TYPE_KEYWORDS) as Array<[SessionType, RegExp]>) {
    if (pattern.test(goal)) return type;
  }
  return 'general';
}

// ── Browser detection ─────────────────────────────────────────────────────────

const BROWSER_BUNDLE_IDS = new Set([
  'com.google.Chrome', 'org.mozilla.firefox', 'com.apple.Safari',
  'com.microsoft.edgemac', 'com.brave.Browser', 'com.operasoftware.Opera',
  'company.thebrowser.Browser', 'app.zen-browser.zen',
  'com.vivaldi.Vivaldi', 'com.kagi.kagimacOS',
]);
const BROWSER_APP_NAME_RE = /\b(chrome|firefox|safari|edge|brave|opera|arc|zen browser|vivaldi|orion|browser)\b/i;

export function isBrowserApp(appName: string, bundleId: string): boolean {
  return BROWSER_BUNDLE_IDS.has(bundleId) || BROWSER_APP_NAME_RE.test(appName);
}

// ── Hard distraction rules ────────────────────────────────────────────────────

const GAME_BUNDLE_IDS = new Set([
  'com.valvesoftware.steam', 'com.epicgames.launcher',
  'com.epicgames.EpicGamesLauncher', 'com.roblox.robloxstudio',
  'com.mojang.minecraftlauncher', 'net.battlenet.bna',
]);
const HARD_DISTRACTION_APP_NAME_RE = /\b(steam|epic games|epicgames|roblox|minecraft|fortnite|valorant|league of legends|overwatch|apex legends|genshin impact)\b/i;

// Browser games and explicit play-online pages
const BROWSER_GAME_TAB_RE = /\b(slither\.io|agar\.io|paper\.io|poki\.com|crazygames|coolmathgames|unblocked games?|flappy bird|snake game|2048|geometry dash|bloons|run 3)\b|play online|browser games?|unblocked \d|arcade games?/i;

// ── Desktop app bundle sets ───────────────────────────────────────────────────

const CODING_FOCUS_BUNDLES = new Set([
  'com.microsoft.VSCode', 'com.apple.dt.Xcode', 'io.cursor.Cursor',
  'com.sublimetext.4', 'dev.zed.Zed', 'com.jetbrains.intellij',
  'com.jetbrains.webstorm', 'com.jetbrains.pycharm', 'com.jetbrains.goland',
  'com.jetbrains.clion', 'com.jetbrains.rider', 'com.jetbrains.datagrip',
  'com.jetbrains.rubymine', 'com.jetbrains.appcode',
  'com.todesktop.230313mzl4w4u92', // Windsurf
]);
const CODING_FOCUS_NAME_RE = /\b(vs code|vscode|visual studio code|cursor|zed|xcode|webstorm|pycharm|intellij|android studio|sublime text?|windsurf)\b/i;

const CODING_SUPPORTIVE_BUNDLES = new Set([
  'com.apple.Terminal', 'com.googlecode.iterm2', 'dev.warp.Warp',
  'com.mitchellh.ghostty', 'com.alacritty.Alacritty',
  'com.github.GitHubDesktop', 'com.postmanlabs.mac', 'com.insomnia.app',
  'io.paw.mac', 'com.tableplus.TablePlus', 'com.sequelpro.SequelPro',
  'com.dbeaver.product', 'com.tinyapp.TableFlip', 'com.docker.docker',
  'com.virtualbox.app', 'com.parallels.desktop',
  'com.apple.dt.Instruments', 'com.apple.Simulator',
]);
const CODING_SUPPORTIVE_NAME_RE = /\b(terminal|iterm2?|ghostty|warp|alacritty|github desktop|postman|insomnia|tableplus|sequel pro|dbeaver|docker|simulator)\b/i;

const WRITING_FOCUS_BUNDLES = new Set([
  'com.microsoft.Word', 'com.apple.iWork.Pages', 'com.ulyssesapp.mac',
]);

const WRITING_SUPPORTIVE_BUNDLES = new Set([
  'com.obsidian.md', 'md.obsidian', 'com.notion.id',
  'com.apple.Notes', 'net.shinyfrog.bear', 'com.microsoft.OneNote',
  'com.microsoft.Powerpoint', 'com.apple.iWork.Keynote',
]);

const DESIGN_FOCUS_BUNDLES = new Set([
  'com.figma.Desktop', 'com.sketch.sketch', 'com.adobe.Photoshop',
  'com.adobe.illustrator', 'com.adobe.InDesign', 'com.adobe.Premiere',
  'com.adobe.AfterEffects', 'com.adobe.AdobeXD',
]);
const DESIGN_FOCUS_NAME_RE = /\b(figma|sketch|photoshop|illustrator|indesign|premiere|after effects|adobe xd)\b/i;

const STUDY_SUPPORTIVE_BUNDLES = new Set([
  'com.obsidian.md', 'md.obsidian', 'com.notion.id',
  'com.apple.Notes', 'net.shinyfrog.bear', 'com.microsoft.OneNote',
  'com.adobe.Reader', 'com.readdle.PDFExpert', 'com.pdfpen.pdfpen7',
  'com.readdle.pdf-squeezer-4',
]);

const MEETING_BUNDLES = new Set([
  'us.zoom.xos', 'com.microsoft.teams', 'com.microsoft.teams2', 'com.loom.desktop',
]);

const DISTRACTION_DESKTOP_BUNDLES = new Set([
  'com.hnc.Discord', 'com.spotify.client', 'com.apple.TV',
  'com.facebook.archon', 'com.apple.Music', 'com.whatsapp.WhatsApp',
  'ph.telegra.Telegraph',
]);

// ── Content classification patterns ───────────────────────────────────────────

// Not triggered by "video" alone — only specific patterns
const ENTERTAINMENT_DISTRACTION_RE = /\b(official music video|music video|mukbang|reaction video|stream highlights?|funny moments|lets? play|let's play|gaming highlights|speedrun|vlog)\b/i;
const GAMING_VIDEO_RE = /\b(gameplay|playthrough|game walkthrough|boss fight|let'?s play|gaming)\b/i;
const EDUCATIONAL_RE = /\b(tutorial|how.?to|lecture|course|lesson|guide|explained?|learning|walkthrough|crash course|introduction to|beginner.?s? guide|tips and tricks|masterclass|step.?by.?step)\b/i;

const DISTRACTION_SITE_KEYWORDS = [
  'reddit', 'twitter', 'instagram', 'tiktok', 'twitch', 'netflix',
  'hulu', 'disney+', 'disneyplus', 'peacock', 'facebook', 'snapchat',
  '9gag', 'tumblr', 'espn', 'crunchyroll', 'soundcloud', 'bandcamp',
];

// ── Site name extraction (used for session corrections) ───────────────────────

const SITE_NAME_PATTERNS: Array<[RegExp, string]> = [
  [/\byoutube\b/i,                         'youtube'],
  [/\bgithub\b/i,                          'github'],
  [/\bgitlab\b/i,                          'gitlab'],
  [/\breddit\b/i,                          'reddit'],
  [/\btwitter\b|\bx\.com\b/i,              'twitter'],
  [/\bnetflix\b/i,                         'netflix'],
  [/\btwitch\b/i,                          'twitch'],
  [/\bgoogle docs?\b/i,                    'google-docs'],
  [/\bgoogle sheets?\b/i,                  'google-sheets'],
  [/\bgoogle slides?\b/i,                  'google-slides'],
  [/\bcanvas\b/i,                          'canvas'],
  [/\bfigma\b/i,                           'figma'],
  [/\bnotion\b/i,                          'notion'],
  [/\bstack overflow\b|\bstackoverflow\b/i, 'stackoverflow'],
  [/\binstagram\b/i,                       'instagram'],
  [/\btiktok\b/i,                          'tiktok'],
  [/\blinear\b/i,                          'linear'],
  [/\bjira\b/i,                            'jira'],
  [/\bvercel\b/i,                          'vercel'],
  [/\bnetlify\b/i,                         'netlify'],
];

export function extractSiteName(tabTitle: string): string | undefined {
  const lower = tabTitle.toLowerCase();
  for (const [pattern, name] of SITE_NAME_PATTERNS) {
    if (pattern.test(lower)) return name;
  }
  return undefined;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'was',
  'were', 'has', 'have', 'had', 'not', 'you', 'your', 'how', 'what',
  'when', 'where', 'why', 'who', 'which', 'all', 'can', 'will', 'about',
  'into', 'more', 'just', 'com', 'www', 'free', 'best', 'tips', 'ways',
  'make', 'get', 'use', 'need', 'want', 'also', 'here', 'there', 'then',
  'them', 'they', 'been', 'being', 'every', 'each', 'some', 'any',
]);

export function extractTitleKeywords(tabTitle: string, siteName?: string): string[] {
  const lower = tabTitle.toLowerCase();
  // Strip trailing site-name suffixes like "- YouTube" or "| GitHub"
  const cleaned = lower
    .replace(/\s*[-|–—]\s*(youtube|github|gitlab|reddit|twitter|google docs?|google sheets?|google slides?|canvas|figma|notion|stack overflow|stackoverflow|instagram|tiktok|twitch|netflix|linear)\s*$/i, '')
    .trim();
  const siteRoot = siteName?.replace(/-\w+$/, ''); // "google-docs" → "google"
  const words = cleaned.split(/\W+/).filter(w =>
    w.length >= 4 &&
    !STOP_WORDS.has(w) &&
    !/^\d+$/.test(w) &&
    !(siteRoot && w === siteRoot),
  );
  return [...new Set(words)].slice(0, 6);
}

// ── Correction matching ───────────────────────────────────────────────────────

function findCorrection(
  appName: string,
  tabTitle: string,
  isBrowser: boolean,
  corrections: SessionCorrection[],
): SessionCorrection | undefined {
  for (const c of corrections) {
    if (c.isBrowser !== isBrowser) continue;
    if (!isBrowser) {
      if (c.appName && c.appName.toLowerCase() === appName.toLowerCase()) return c;
    } else {
      if (!c.siteName) continue;
      const lower = tabTitle.toLowerCase();
      // Site name must appear in the tab title
      if (!lower.includes(c.siteName.replace(/-/g, ' '))) continue;
      // If no keywords stored: match any page on this site
      if (c.titleKeywords.length === 0) return c;
      // At least one keyword must match
      if (c.titleKeywords.some(kw => lower.includes(kw))) return c;
    }
  }
  return undefined;
}

// ── Session-goal relevance ────────────────────────────────────────────────────

function sessionGoalRelevance(tabTitle: string, sessionGoal: string): 'high' | 'medium' | 'low' {
  const titleWords = tabTitle.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
  const goalWords  = sessionGoal.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOP_WORDS.has(w));
  const overlap = goalWords.filter(gw => titleWords.some(tw => tw.includes(gw) || gw.includes(tw)));
  if (overlap.length >= 2) return 'high';
  if (overlap.length === 1) return 'medium';
  return 'low';
}

// ── YouTube ───────────────────────────────────────────────────────────────────

function classifyYouTube(tabTitle: string, sessionType: SessionType, sessionGoal: string): ClassificationResult {
  const lower = tabTitle.toLowerCase();

  // YouTube home / music app page
  if (/^youtube$|^youtube - |youtube music$/.test(lower)) {
    return { category: 'distraction', sessionType, confidence: 'medium', reason: 'youtube home' };
  }

  // Gaming content
  if (GAMING_VIDEO_RE.test(tabTitle)) {
    return { category: 'distraction', sessionType, confidence: 'high', reason: 'youtube gaming content' };
  }
  // Entertainment (music videos, mukbangs, reaction, etc.)
  if (ENTERTAINMENT_DISTRACTION_RE.test(tabTitle)) {
    return { category: 'distraction', sessionType, confidence: 'high', reason: 'youtube entertainment' };
  }

  // Educational patterns
  if (EDUCATIONAL_RE.test(tabTitle)) {
    const relevance = sessionGoalRelevance(tabTitle, sessionGoal);
    if (relevance === 'high' || relevance === 'medium') {
      return { category: 'supportive', sessionType, confidence: 'medium', reason: 'youtube educational, session-relevant' };
    }
    return { category: 'needs-clarification', sessionType, confidence: 'medium', reason: 'youtube educational, unclear relevance' };
  }

  // Default YouTube = distraction
  return { category: 'distraction', sessionType, confidence: 'medium', reason: 'youtube default' };
}

// ── Browser page ──────────────────────────────────────────────────────────────

function classifyBrowserPage(
  tabTitle: string,
  sessionType: SessionType,
  sessionGoal: string,
): ClassificationResult {
  const lower = tabTitle.toLowerCase();

  // Browser game — hard distraction
  if (BROWSER_GAME_TAB_RE.test(tabTitle)) {
    return { category: 'hard-distraction', sessionType, confidence: 'high', reason: 'browser game' };
  }

  // Known distraction sites
  for (const site of DISTRACTION_SITE_KEYWORDS) {
    if (lower.includes(site)) {
      return { category: 'distraction', sessionType, confidence: 'high', reason: `distraction site: ${site}` };
    }
  }

  // YouTube (complex)
  if (lower.includes('youtube')) {
    return classifyYouTube(tabTitle, sessionType, sessionGoal);
  }

  // Code hosting
  if (lower.includes('github') || lower.includes('gitlab')) {
    const cat: ActivityCategory = sessionType === 'coding' ? 'focus' : 'supportive';
    return { category: cat, sessionType, confidence: 'high', reason: 'code hosting' };
  }

  // Stack Overflow
  if (lower.includes('stack overflow') || lower.includes('stackoverflow')) {
    const cat: ActivityCategory = sessionType === 'coding' ? 'supportive' : 'neutral';
    return { category: cat, sessionType, confidence: 'high', reason: 'stack overflow' };
  }

  // Developer docs / package registries
  if (
    lower.includes('mdn web docs') || lower.includes('developer.mozilla') ||
    lower.includes('devdocs') || lower.includes('npmjs') ||
    lower.includes('pypi.org') || lower.includes('pkg.go.dev') ||
    lower.includes('docs.rs') || lower.includes('rubygems.org')
  ) {
    const cat: ActivityCategory = sessionType === 'coding' ? 'supportive' : 'neutral';
    return { category: cat, sessionType, confidence: 'high', reason: 'developer reference' };
  }

  // Google Docs / Slides / Sheets
  if (lower.includes('google docs') || lower.includes('- google docs')) {
    const cat: ActivityCategory = sessionType === 'writing' ? 'focus' : 'supportive';
    return { category: cat, sessionType, confidence: 'high', reason: 'google docs' };
  }
  if (lower.includes('google slides') || lower.includes('- google slides')) {
    const cat: ActivityCategory = (sessionType === 'writing' || sessionType === 'study') ? 'focus' : 'supportive';
    return { category: cat, sessionType, confidence: 'high', reason: 'google slides' };
  }
  if (lower.includes('google sheets') || lower.includes('- google sheets')) {
    return { category: 'supportive', sessionType, confidence: 'high', reason: 'google sheets' };
  }

  // Canvas LMS — match on tab titles that end with "Canvas" or include instructure
  if (lower.endsWith('canvas') || lower.endsWith('| canvas') || lower.endsWith('- canvas') || lower.includes('canvas.instructure') || lower.includes('instructure.com')) {
    const cat: ActivityCategory = sessionType === 'study' ? 'focus' : 'supportive';
    return { category: cat, sessionType, confidence: 'high', reason: 'canvas lms' };
  }

  // Figma in browser
  if (lower.includes('figma')) {
    const cat: ActivityCategory = sessionType === 'design' ? 'focus' : 'supportive';
    return { category: cat, sessionType, confidence: 'high', reason: 'figma' };
  }

  // Notion in browser
  if (lower.includes('notion')) {
    const cat: ActivityCategory = (sessionType === 'writing' || sessionType === 'study') ? 'supportive' : 'neutral';
    return { category: cat, sessionType, confidence: 'medium', reason: 'notion' };
  }

  // Dev platform tools
  if (lower.includes('linear') || lower.includes('vercel') || lower.includes('netlify') || lower.includes('jira')) {
    const cat: ActivityCategory = sessionType === 'coding' ? 'supportive' : 'neutral';
    return { category: cat, sessionType, confidence: 'medium', reason: 'dev tool web' };
  }

  // Google Search
  if (lower === 'google' || lower.endsWith('- google search') || lower.endsWith('- google')) {
    return { category: 'neutral', sessionType, confidence: 'medium', reason: 'google search' };
  }

  // New tab / blank
  if (!lower || lower === 'new tab' || lower === 'about:blank') {
    return { category: 'neutral', sessionType, confidence: 'low', reason: 'new tab' };
  }

  return { category: 'neutral', sessionType, confidence: 'low', reason: 'unrecognized browser page' };
}

// ── Desktop app ───────────────────────────────────────────────────────────────

function classifyDesktopApp(
  appName: string,
  bundleId: string,
  sessionType: SessionType,
): ActivityCategory | null {
  // Hard distraction: game launchers and known game apps
  if (GAME_BUNDLE_IDS.has(bundleId) || HARD_DISTRACTION_APP_NAME_RE.test(appName)) return 'hard-distraction';
  // Always-distraction: social/entertainment non-browser apps
  if (DISTRACTION_DESKTOP_BUNDLES.has(bundleId)) return 'distraction';
  // Meetings: active work for any session type
  if (MEETING_BUNDLES.has(bundleId)) return 'focus';

  switch (sessionType) {
    case 'coding':
      if (CODING_FOCUS_BUNDLES.has(bundleId) || CODING_FOCUS_NAME_RE.test(appName))             return 'focus';
      if (CODING_SUPPORTIVE_BUNDLES.has(bundleId) || CODING_SUPPORTIVE_NAME_RE.test(appName))   return 'supportive';
      if (WRITING_SUPPORTIVE_BUNDLES.has(bundleId))                                              return 'supportive'; // notes during coding
      if (STUDY_SUPPORTIVE_BUNDLES.has(bundleId))                                               return 'supportive'; // PDFs for reference
      if (WRITING_FOCUS_BUNDLES.has(bundleId))                                                  return 'neutral';
      if (DESIGN_FOCUS_BUNDLES.has(bundleId) || DESIGN_FOCUS_NAME_RE.test(appName))             return 'neutral';
      break;

    case 'writing':
      if (WRITING_FOCUS_BUNDLES.has(bundleId))                                                   return 'focus';
      if (WRITING_SUPPORTIVE_BUNDLES.has(bundleId))                                              return 'supportive';
      if (STUDY_SUPPORTIVE_BUNDLES.has(bundleId))                                               return 'supportive'; // PDFs for research
      if (CODING_FOCUS_BUNDLES.has(bundleId) || CODING_FOCUS_NAME_RE.test(appName))             return 'neutral'; // VS Code not focus for writing
      if (CODING_SUPPORTIVE_BUNDLES.has(bundleId) || CODING_SUPPORTIVE_NAME_RE.test(appName))   return 'neutral';
      if (DESIGN_FOCUS_BUNDLES.has(bundleId) || DESIGN_FOCUS_NAME_RE.test(appName))             return 'neutral';
      break;

    case 'study':
      if (STUDY_SUPPORTIVE_BUNDLES.has(bundleId))                                               return 'supportive';
      if (WRITING_FOCUS_BUNDLES.has(bundleId))                                                   return 'supportive'; // word processors for essays
      if (WRITING_SUPPORTIVE_BUNDLES.has(bundleId))                                              return 'supportive'; // notes
      if (CODING_FOCUS_BUNDLES.has(bundleId) || CODING_FOCUS_NAME_RE.test(appName))             return 'neutral'; // VS Code not focus for study
      if (CODING_SUPPORTIVE_BUNDLES.has(bundleId) || CODING_SUPPORTIVE_NAME_RE.test(appName))   return 'neutral';
      if (DESIGN_FOCUS_BUNDLES.has(bundleId) || DESIGN_FOCUS_NAME_RE.test(appName))             return 'neutral';
      break;

    case 'design':
      if (DESIGN_FOCUS_BUNDLES.has(bundleId) || DESIGN_FOCUS_NAME_RE.test(appName))             return 'focus';
      if (WRITING_SUPPORTIVE_BUNDLES.has(bundleId))                                              return 'supportive'; // design notes
      if (WRITING_FOCUS_BUNDLES.has(bundleId))                                                   return 'supportive'; // writing design briefs
      if (CODING_FOCUS_BUNDLES.has(bundleId) || CODING_FOCUS_NAME_RE.test(appName))             return 'neutral'; // VS Code not focus for design
      if (CODING_SUPPORTIVE_BUNDLES.has(bundleId) || CODING_SUPPORTIVE_NAME_RE.test(appName))   return 'neutral';
      if (STUDY_SUPPORTIVE_BUNDLES.has(bundleId))                                               return 'neutral';
      break;

    case 'general':
    default:
      // No session-specific bias — let everything unrecognized fall through to neutral
      break;
  }

  return null;
}

// ── Main classifier ───────────────────────────────────────────────────────────

export function classifyActivity(input: ClassifyActivityInput): ClassificationResult {
  const { sessionGoal, appName, bundleId, windowTitle, tabTitle, sessionCorrections } = input;
  const sessionType = guessSessionType(sessionGoal);
  const isBrowser   = isBrowserApp(appName, bundleId);

  // 1. Hard distraction — highest priority, cannot be overridden by corrections
  if (GAME_BUNDLE_IDS.has(bundleId) || HARD_DISTRACTION_APP_NAME_RE.test(appName)) {
    return { category: 'hard-distraction', sessionType, confidence: 'high', reason: 'known game/entertainment app' };
  }
  if (isBrowser && (BROWSER_GAME_TAB_RE.test(tabTitle) || BROWSER_GAME_TAB_RE.test(windowTitle))) {
    return { category: 'hard-distraction', sessionType, confidence: 'high', reason: 'browser game detected' };
  }

  // 2. Current-session corrections (user has explicitly classified this before)
  const correction = findCorrection(appName, tabTitle, isBrowser, sessionCorrections);
  if (correction) {
    return { category: correction.category, sessionType, confidence: 'high', reason: 'session correction' };
  }

  // 3. Always-distraction non-browser apps
  if (!isBrowser && DISTRACTION_DESKTOP_BUNDLES.has(bundleId)) {
    return { category: 'distraction', sessionType, confidence: 'high', reason: 'distraction app' };
  }

  // 4. Browser: classify by domain/title content
  if (isBrowser) {
    return classifyBrowserPage(tabTitle, sessionType, sessionGoal);
  }

  // 5. Desktop app: session-aware classification
  const desktopCat = classifyDesktopApp(appName, bundleId, sessionType);
  if (desktopCat !== null) {
    return { category: desktopCat, sessionType, confidence: 'high', reason: 'session-aware desktop rule' };
  }

  // 6. Unknown fallback
  return { category: 'neutral', sessionType, confidence: 'low', reason: 'no rule matched' };
}
