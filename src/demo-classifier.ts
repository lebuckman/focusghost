/**
 * FocusGhost — Activity Classifier Demo
 * Run: npx tsx src/demo-classifier.ts
 */
import {
  classifyActivity,
  guessSessionType,
  isBrowserApp,
  extractSiteName,
  extractTitleKeywords,
} from './main/classification/activityClassifier';
import type { SessionCorrection } from './shared/classificationTypes';

// ── ANSI colours ──────────────────────────────────────────────────────────────

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  // category colours
  focus:   '\x1b[38;5;78m',   // teal-green
  supportive: '\x1b[38;5;43m',// cyan-ish
  neutral: '\x1b[38;5;244m',  // grey
  distraction: '\x1b[38;5;203m', // red
  hard:    '\x1b[38;5;196m',  // bright red
  clarify: '\x1b[38;5;220m',  // amber
  // ui
  header:  '\x1b[38;5;105m',  // purple
  section: '\x1b[38;5;75m',   // sky blue
  label:   '\x1b[38;5;250m',
  muted:   '\x1b[38;5;240m',
};

function colorFor(cat: string): string {
  switch (cat) {
    case 'focus':              return C.focus;
    case 'supportive':         return C.supportive;
    case 'neutral':            return C.neutral;
    case 'distraction':        return C.distraction;
    case 'hard-distraction':   return C.hard;
    case 'needs-clarification':return C.clarify;
    default:                   return C.label;
  }
}

function badge(cat: string): string {
  const icons: Record<string, string> = {
    'focus':               '● focus',
    'supportive':          '◎ supportive',
    'neutral':             '○ neutral',
    'distraction':         '✕ distraction',
    'hard-distraction':    '⊗ hard-distraction',
    'needs-clarification': '? needs-clarification',
  };
  const col = colorFor(cat);
  return `${col}${C.bold}${icons[cat] ?? cat}${C.reset}`;
}

function conf(c: string): string {
  return c === 'high' ? '' : `${C.muted} (${c})${C.reset}`;
}

// ── Test runner ───────────────────────────────────────────────────────────────

interface Case {
  app: string;
  bundle?: string;
  title: string;
  tab?: string; // if omitted, derived from title
}

let passCount = 0;
let totalCount = 0;

function run(
  label: string,
  sessionGoal: string,
  cases: Array<Case & { expect?: string }>,
  corrections: SessionCorrection[] = [],
) {
  const sessionType = guessSessionType(sessionGoal);
  console.log(`\n${C.section}${C.bold}${label}${C.reset}`);
  console.log(`${C.muted}  goal: "${sessionGoal}"  →  session type: ${C.bold}${sessionType}${C.reset}`);
  console.log();

  for (const c of cases) {
    const bundleId = c.bundle ?? '';
    const displayName = c.tab ?? c.app;
    const tabTitle = c.tab !== undefined ? c.tab : (isBrowserApp(c.app, bundleId) ? c.title : c.app);

    const result = classifyActivity({
      sessionGoal,
      appName:          c.app,
      bundleId,
      windowTitle:      c.title,
      tabTitle,
      sessionCorrections: corrections,
    });

    const col = colorFor(result.category);
    const appCol = `${C.bold}${displayName.padEnd(38)}${C.reset}`;
    const cat = badge(result.category);
    const reason = `${C.muted}${result.reason}${conf(result.confidence)}${C.reset}`;

    // Pass/fail if expected is given
    let mark = '';
    if (c.expect !== undefined) {
      totalCount++;
      if (result.category === c.expect) {
        passCount++;
        mark = `  ${C.focus}✓${C.reset}`;
      } else {
        mark = `  ${C.hard}✗ expected ${c.expect}${C.reset}`;
      }
    }

    console.log(`  ${col}│${C.reset} ${appCol} ${cat.padEnd(42)}  ${reason}${mark}`);
  }
}

// ── Header ────────────────────────────────────────────────────────────────────

console.log(`\n${C.header}${C.bold}╔══════════════════════════════════════════════════════════╗`);
console.log(`║        FocusGhost · Activity Classifier Demo            ║`);
console.log(`╚══════════════════════════════════════════════════════════╝${C.reset}\n`);

// ── Section 1: Coding session ─────────────────────────────────────────────────

run('1 · Coding session — "Fix FocusGhost popup bugs"',
  'Fix FocusGhost popup bugs',
  [
    { app: 'Visual Studio Code', bundle: 'com.microsoft.VSCode',  title: 'main.ts — focusghost',  tab: 'main.ts — focusghost', expect: 'focus' },
    { app: 'Terminal',           bundle: 'com.apple.Terminal',    title: 'bash — 80x24',          expect: 'supportive' },
    { app: 'GitHub Desktop',     bundle: 'com.github.GitHubDesktop', title: 'focusghost',         expect: 'supportive' },
    { app: 'Google Chrome',      bundle: 'com.google.Chrome',    title: 'focusghost · GitHub — Google Chrome', tab: 'focusghost · GitHub', expect: 'focus' },
    { app: 'Google Chrome',      bundle: 'com.google.Chrome',    title: 'Stack Overflow — Google Chrome', tab: 'Stack Overflow', expect: 'supportive' },
    { app: 'Discord',            bundle: 'com.hnc.Discord',       title: '#general',              expect: 'distraction' },
  ],
);

// ── Section 2: Writing session ────────────────────────────────────────────────

run('2 · Writing session — "Work on persuasive speech"',
  'Work on persuasive speech',
  [
    { app: 'Microsoft Edge', bundle: 'com.microsoft.edgemac', title: 'My speech draft - Google Docs — Microsoft Edge', tab: 'My speech draft - Google Docs', expect: 'focus' },
    { app: 'Microsoft Word', bundle: 'com.microsoft.Word',   title: 'speech_draft.docx',          expect: 'focus' },
    { app: 'Visual Studio Code', bundle: 'com.microsoft.VSCode', title: 'main.ts',               expect: 'neutral' },
    { app: 'Terminal',       bundle: 'com.apple.Terminal',   title: 'bash',                       expect: 'neutral' },
    { app: 'Microsoft Edge', bundle: 'com.microsoft.edgemac', title: 'How to improve public speaking skills - YouTube — Microsoft Edge', tab: 'How to improve public speaking skills - YouTube', expect: 'needs-clarification' },
    { app: 'Microsoft Edge', bundle: 'com.microsoft.edgemac', title: 'Coldplay - Yellow (Official Music Video) - YouTube — Microsoft Edge', tab: 'Coldplay - Yellow (Official Music Video) - YouTube', expect: 'distraction' },
    { app: 'Microsoft Edge', bundle: 'com.microsoft.edgemac', title: 'Mukbang eating show 4K - YouTube — Microsoft Edge', tab: 'Mukbang eating show 4K - YouTube', expect: 'distraction' },
  ],
);

// ── Section 3: Study session ──────────────────────────────────────────────────

run('3 · Study session — "Study for algorithms exam"',
  'Study for algorithms exam',
  [
    { app: 'Google Chrome', bundle: 'com.google.Chrome', title: 'CS101 | Canvas — Google Chrome', tab: 'CS101 | Canvas', expect: 'focus' },
    { app: 'Obsidian',      bundle: 'md.obsidian',       title: 'Algorithms notes',               expect: 'supportive' },
    { app: 'Google Chrome', bundle: 'com.google.Chrome', title: 'Sorting algorithms tutorial - YouTube — Google Chrome', tab: 'Sorting algorithms tutorial - YouTube', expect: 'supportive' }, // "algorithms" in title matches goal → session-relevant → supportive, not ambiguous
    { app: 'Google Chrome', bundle: 'com.google.Chrome', title: 'Reddit — Google Chrome', tab: 'Reddit', expect: 'distraction' },
    { app: 'Visual Studio Code', bundle: 'com.microsoft.VSCode', title: 'solution.py',            expect: 'neutral' },
    { app: 'Spotify',       bundle: 'com.spotify.client', title: 'Spotify',                       expect: 'distraction' },
  ],
);

// ── Section 4: Design session ─────────────────────────────────────────────────

run('4 · Design session — "Make art in Photoshop for the logo"',
  'Make art in Photoshop for the logo',
  [
    { app: 'Adobe Photoshop', bundle: 'com.adobe.Photoshop',   title: 'logo_v3.psd',             expect: 'focus' },
    { app: 'Figma',           bundle: 'com.figma.Desktop',     title: 'Brand system',             expect: 'focus' },
    { app: 'Notion',          bundle: 'com.notion.id',         title: 'Design notes',             expect: 'supportive' },
    { app: 'Visual Studio Code', bundle: 'com.microsoft.VSCode', title: 'styles.css',             expect: 'neutral' },
    { app: 'Terminal',        bundle: 'com.apple.Terminal',    title: 'bash',                     expect: 'neutral' },
    { app: 'Google Chrome',   bundle: 'com.google.Chrome',     title: 'Figma — Google Chrome',    tab: 'Figma', expect: 'focus' },
  ],
);

// ── Section 5: Browser game detection ────────────────────────────────────────

run('5 · Browser games → hard-distraction (any session type)',
  'Study for algorithms exam',
  [
    { app: 'Microsoft Edge', bundle: 'com.microsoft.edgemac', title: 'Slither.io — Microsoft Edge',        tab: 'Slither.io',                 expect: 'hard-distraction' },
    { app: 'Google Chrome',  bundle: 'com.google.Chrome',     title: 'Flappy Bird - Play Online — Chrome', tab: 'Flappy Bird - Play Online',  expect: 'hard-distraction' },
    { app: 'Google Chrome',  bundle: 'com.google.Chrome',     title: 'Poki.com - Unblocked Games — Chrome', tab: 'Poki.com - Unblocked Games', expect: 'hard-distraction' },
    { app: 'Google Chrome',  bundle: 'com.google.Chrome',     title: 'agar.io — Chrome',                   tab: 'agar.io',                    expect: 'hard-distraction' },
    { app: 'Google Chrome',  bundle: 'com.google.Chrome',     title: 'coolmathgames — Chrome',             tab: 'coolmathgames',              expect: 'hard-distraction' },
  ],
);

// ── Section 6: Session corrections ───────────────────────────────────────────

console.log(`\n${C.section}${C.bold}6 · Session corrections — narrow scope (browser)${C.reset}`);
console.log(`${C.muted}  goal: "Work on persuasive speech"${C.reset}\n`);

// Simulate: user marked a speech tutorial on YouTube as focus
const corrections: SessionCorrection[] = [];
const tabForCorrection = 'How to improve public speaking skills - YouTube';
const siteName = extractSiteName(tabForCorrection);
const kws      = extractTitleKeywords(tabForCorrection, siteName);
corrections.push({ isBrowser: true, siteName, titleKeywords: kws, category: 'focus' });

console.log(`  ${C.muted}User clicked "yes, count as focus" on:${C.reset}`);
console.log(`  ${C.bold}"${tabForCorrection}"${C.reset}`);
console.log(`  ${C.muted}→ stored: siteName=${C.bold}${siteName}${C.reset}${C.muted}, keywords=${C.bold}${JSON.stringify(kws)}${C.reset}\n`);

const correctionCases = [
  { title: 'How to structure a persuasive speech - YouTube',  expect: 'supportive',  note: '"speech" ≠ "speaking" → correction misses, classifier returns supportive' },
  { title: 'Public speaking anxiety tips - YouTube',          expect: 'focus',       note: 'keyword "public" matches → correction applies' },
  { title: 'Coldplay - Yellow (Official Music Video) - YouTube', expect: 'distraction', note: 'no keyword match → normal classifier' },
  { title: 'Mukbang eating show 4K - YouTube',                expect: 'distraction', note: 'no keyword match → normal classifier' },
  { title: 'Dashboard | Canvas',                              expect: 'supportive',  note: 'Canvas — unrelated to YouTube correction' },
  { title: 'My speech draft - Google Docs',                   expect: 'focus',       note: 'Google Docs — unrelated to YouTube correction' },
];

for (const c of correctionCases) {
  const result = classifyActivity({
    sessionGoal: 'Work on persuasive speech',
    appName: 'Microsoft Edge',
    bundleId: 'com.microsoft.edgemac',
    windowTitle: `${c.title} — Microsoft Edge`,
    tabTitle: c.title,
    sessionCorrections: corrections,
  });

  totalCount++;
  const ok = result.category === c.expect;
  if (ok) passCount++;

  const col = colorFor(result.category);
  const mark = ok ? `${C.focus}✓${C.reset}` : `${C.hard}✗ expected ${c.expect}${C.reset}`;
  const noteStr = `${C.muted}${c.note}${C.reset}`;
  console.log(`  ${col}│${C.reset} ${C.bold}${c.title.padEnd(46)}${C.reset} ${badge(result.category).padEnd(42)}  ${noteStr}  ${mark}`);
}

// ── Section 7: General session ────────────────────────────────────────────────

run('7 · General session — no session bias',
  'Just working on stuff',
  [
    { app: 'Visual Studio Code', bundle: 'com.microsoft.VSCode', title: 'index.ts', expect: 'neutral' },
    { app: 'Figma',  bundle: 'com.figma.Desktop',  title: 'Design system',           expect: 'neutral' },
    { app: 'Google Chrome', bundle: 'com.google.Chrome', title: 'YouTube — Google Chrome', tab: 'YouTube', expect: 'distraction' },
    { app: 'Discord', bundle: 'com.hnc.Discord',   title: '#general',                expect: 'distraction' },
  ],
);

// ── Summary ───────────────────────────────────────────────────────────────────

const pct = Math.round((passCount / totalCount) * 100);
const summaryCol = pct === 100 ? C.focus : pct >= 80 ? C.clarify : C.hard;
console.log(`\n${C.muted}${'─'.repeat(70)}${C.reset}`);
console.log(`${summaryCol}${C.bold}  ${passCount}/${totalCount} assertions passed (${pct}%)${C.reset}\n`);
