import React, { useState, useEffect } from 'react';
import GhostMascot from '../components/GhostMascot';
import AppBadge from '../components/AppBadge';
import MetricChip from '../components/MetricChip';
import type { SessionUpdate, SwitchEntry, WindowCategory } from '../../shared/ipc-contract';

interface Props {
  task: string;
  durationMin: number;
  sessionUpdate: SessionUpdate;
  onOpenChat: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtCountdown(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function fmtDur(sec: number, isFirst: boolean): string {
  if (isFirst && sec < 30) return 'now';
  return fmtDuration(sec);
}

// Extracts sub-context from a window title, stripping app-name suffixes.
// "App.jsx — focusghost — Visual Studio Code" → "App.jsx"
// "#general — Discord" → "#general"
// Returns null when result equals the app name (nothing useful to show).
function deriveSubLabel(title: string | undefined, appName: string): string | null {
  if (!title) return null;
  const knownSuffixes = [
    'Visual Studio Code', 'VS Code', 'Discord', 'Google Chrome', 'Safari',
    'Firefox', 'Notion', 'Obsidian', 'Slack', 'Figma', 'Spotify',
  ];
  let result = title;
  // Strip known app suffixes (e.g. " — Visual Studio Code" or " - Discord")
  for (const suffix of [appName, ...knownSuffixes]) {
    result = result.replace(new RegExp(`\\s*[\\-—|]\\s*${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$`, 'i'), '').trim();
  }
  if (!result || result.toLowerCase() === appName.toLowerCase()) return null;
  return result;
}

// ─── Favicon lookup ──────────────────────────────────────────────────────────

// Site-specific: matched against the raw window title (newest tab/channel/file).
// Order matters — first match wins, so more specific entries come first.
const FAVICON_ENTRIES: Array<[string, string]> = [
  ['youtube',            'youtube.com'],
  ['github',             'github.com'],
  ['stackoverflow',      'stackoverflow.com'],
  ['stack overflow',     'stackoverflow.com'],
  ['reddit',             'reddit.com'],
  ['twitter',            'twitter.com'],
  ['discord',            'discord.com'],
  ['notion',             'notion.so'],
  ['figma',              'figma.com'],
  ['chatgpt',            'chat.openai.com'],
  ['claude.ai',          'claude.ai'],
  ['twitch',             'twitch.tv'],
  ['netflix',            'netflix.com'],
  ['spotify',            'spotify.com'],
  ['instagram',          'instagram.com'],
  ['facebook',           'facebook.com'],
  ['linkedin',           'linkedin.com'],
  ['google docs',        'docs.google.com'],
  ['google sheets',      'sheets.google.com'],
  ['vercel',             'vercel.com'],
  ['netlify',            'netlify.com'],
  ['slack',              'slack.com'],
  ['zoom',               'zoom.us'],
  ['obsidian',           'obsidian.md'],
  ['linear',             'linear.app'],
  ['visual studio code', 'code.visualstudio.com'],
];

// App-generic: exact app-name match → generic icon for browsers/editors.
// Only used when no site-specific favicon matched from rawTitle.
const APP_FAVICON_DOMAINS: Record<string, string> = {
  'Google Chrome':   'google.com',
  'Chrome':          'google.com',
  'Mozilla Firefox': 'firefox.com',
  'Firefox':         'firefox.com',
  'Safari':          'apple.com',
  'Arc':             'arc.net',
  'Zen Browser':     'zen-browser.app',
  'Brave Browser':   'brave.com',
  'Microsoft Edge':  'microsoft.com',
  'Cursor':          'cursor.com',
  'Visual Studio Code': 'code.visualstudio.com',
  'Figma':           'figma.com',
  'Slack':           'slack.com',
  'Discord':         'discord.com',
  'Spotify':         'spotify.com',
  'Notion':          'notion.so',
  'Linear':          'linear.app',
  'Obsidian':        'obsidian.md',
  'Zoom':            'zoom.us',
};

function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

// Stage 1: search raw window title for site-specific keywords (YouTube, GitHub, etc.)
function lookupSiteFavicon(rawTitle: string | undefined): string | null {
  if (!rawTitle) return null;
  const lower = rawTitle.toLowerCase();
  for (const [keyword, domain] of FAVICON_ENTRIES) {
    if (lower.includes(keyword)) return faviconUrl(domain);
  }
  return null;
}

// Stage 2: exact app-name → generic app icon (browser, editor, etc.)
function lookupAppFavicon(appName: string): string | null {
  const domain = APP_FAVICON_DOMAINS[appName];
  return domain ? faviconUrl(domain) : null;
}

// ─── App Icon ────────────────────────────────────────────────────────────────

const APP_ICONS: Record<string, { glyph: string; fg: string; bg: string }> = {
  'VS Code':          { glyph: '</>',  fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  'Visual Studio Code':{ glyph: '</>',  fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  'Cursor':           { glyph: '</>',  fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  'WebStorm':         { glyph: 'WS',   fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  'Terminal':         { glyph: '›_',   fg: '#5dd8e6', bg: 'rgba(93,216,230,0.12)' },
  'iTerm2':           { glyph: '›_',   fg: '#5dd8e6', bg: 'rgba(93,216,230,0.12)' },
  'Discord':          { glyph: '💬',   fg: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  'YouTube':          { glyph: '▶',    fg: '#f87171', bg: 'rgba(248,113,113,0.14)' },
  'Twitter':          { glyph: '✕',    fg: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  'X':                { glyph: '✕',    fg: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  'Reddit':           { glyph: 'R',    fg: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  'Instagram':        { glyph: '◯',    fg: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  'TikTok':           { glyph: '♪',    fg: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  'Twitch':           { glyph: '▶',    fg: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  'Chrome':           { glyph: '◎',    fg: '#5dd8e6', bg: 'rgba(93,216,230,0.12)' },
  'Google Chrome':    { glyph: '◎',    fg: '#5dd8e6', bg: 'rgba(93,216,230,0.12)' },
  'Safari':           { glyph: '◎',    fg: '#5dd8e6', bg: 'rgba(93,216,230,0.12)' },
  'Firefox':          { glyph: '◎',    fg: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  'Notion':           { glyph: 'N',    fg: '#e5e5e5', bg: 'rgba(229,229,229,0.10)' },
  'Obsidian':         { glyph: '◆',    fg: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  'Figma':            { glyph: 'F',    fg: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  'Spotify':          { glyph: '♫',    fg: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  'Slack':            { glyph: '#',    fg: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  'ChatGPT':          { glyph: '✺',    fg: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  'Stack Overflow':   { glyph: 'S',    fg: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  'Zoom':             { glyph: '⬡',    fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  '(idle)':           { glyph: '◌',    fg: '#737373', bg: 'rgba(115,115,115,0.12)' },
};

function AppIcon({ app, rawTitle, size = 28 }: { app: string; rawTitle?: string; size?: number }) {
  const imgSrc = lookupSiteFavicon(rawTitle) ?? lookupAppFavicon(app);
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [imgSrc]);

  const ic = APP_ICONS[app] ?? { glyph: app.charAt(0).toUpperCase(), fg: '#a3a3a3', bg: 'rgba(255,255,255,0.06)' };
  const showImg = !!imgSrc && !imgError;

  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: showImg ? 'rgba(255,255,255,0.05)' : ic.bg,
      border: `0.5px solid ${showImg ? 'rgba(255,255,255,0.10)' : ic.fg + '33'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
    }}>
      {showImg ? (
        <img src={imgSrc} alt="" style={{ width: '70%', height: '70%', objectFit: 'contain' }} onError={() => setImgError(true)} />
      ) : (
        <span style={{ fontSize: size * 0.38, fontFamily: "'JetBrains Mono', monospace", color: ic.fg, fontWeight: 600, letterSpacing: '-0.04em' }}>
          {ic.glyph}
        </span>
      )}
    </div>
  );
}

// ─── Activity Grouping ───────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<WindowCategory, string> = {
  focus:       '#2dd4bf',
  research:    '#60a5fa',
  distraction: '#f87171',
  inactive:    '#737373',
  unknown:     '#737373',
};

interface ActivityEntry {
  sub: string | null;
  durationSec: number;
  isFirst: boolean;
  category: WindowCategory;
}

interface ActivityGroup {
  app: string;
  category: WindowCategory;
  rawTitle?: string;
  entries: ActivityEntry[];
}

function groupSwitches(switches: SwitchEntry[]): ActivityGroup[] {
  const now = Date.now();
  const groups: ActivityGroup[] = [];

  switches.forEach((sw, i) => {
    const prevTimestamp = i === 0 ? now : switches[i - 1].timestamp;
    const durationSec = Math.max(0, Math.round((prevTimestamp - sw.timestamp) / 1000));
    const sub = deriveSubLabel(sw.title, sw.app);
    const entry: ActivityEntry = { sub, durationSec, isFirst: i === 0, category: sw.category };

    const last = groups[groups.length - 1];
    if (last && last.app === sw.app && last.category === sw.category) {
      last.entries.push(entry);
    } else {
      groups.push({ app: sw.app, category: sw.category, rawTitle: sw.title, entries: [entry] });
    }
  });

  return groups;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 'none',
  width: 22, height: 22, padding: 0, borderRadius: 4,
  cursor: 'pointer', color: '#737373',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ActiveSession({ task, durationMin, sessionUpdate, onOpenChat }: Props) {
  const durationSec = durationMin * 60;
  const remaining = Math.max(0, durationSec - sessionUpdate.elapsedSec);
  const progress = Math.min(1, sessionUpdate.elapsedSec / Math.max(1, durationSec));
  const groups = groupSwitches(sessionUpdate.recentSwitches);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', sans-serif", color: '#e5e5e5', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 }}>
          <div style={{
            fontSize: 12, color: '#e5e5e5', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, minWidth: 0, letterSpacing: '-0.01em',
          }}>
            {task}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
            color: '#2dd4bf', fontWeight: 500, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          }}>
            {fmtCountdown(remaining)}
          </div>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0, marginLeft: 2 }}>
            <button onClick={onOpenChat} title="chat" style={iconBtn} aria-label="chat">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1.5 3.5 Q 1.5 2, 3 2 H 9 Q 10.5 2, 10.5 3.5 V 6.5 Q 10.5 8, 9 8 H 5 L 3 10 V 8 Q 1.5 8, 1.5 6.5 Z"
                  stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" fill="none" />
              </svg>
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: '#2dd4bf', transition: 'width 0.5s linear' }} />
        </div>
      </div>

      {/* Current app row */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 10, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em' }}>now</div>
        <div style={{ fontSize: 12, color: '#e5e5e5', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sessionUpdate.currentApp}
        </div>
        <AppBadge category={sessionUpdate.category} app={sessionUpdate.currentApp} />
      </div>

      {/* Metric chips */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '12px 16px' }}>
        <MetricChip label="switches" value={sessionUpdate.switchCount} />
        <MetricChip label="focus"    value={fmtDuration(sessionUpdate.focusSec)} color="teal" />
        <MetricChip label="drift"    value={fmtDuration(sessionUpdate.driftSec)} color={sessionUpdate.driftSec > 60 ? 'red' : undefined} />
      </div>

      {/* Activity feed */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 16px 12px' }}>
        <div style={{ fontSize: 9, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          recent activity
        </div>
        <div className="fg-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {groups.length === 0 && (
            <div style={{ fontSize: 11, color: '#525252', fontStyle: 'italic' }}>no switches yet</div>
          )}
          {groups.map((group, gi) => {
            const catColor = CATEGORY_COLOR[group.category] ?? '#737373';
            const isActive = gi === 0;
            const isSingle = group.entries.length === 1;
            const onlyEntry = group.entries[0];
            const showSubRows = !isSingle || (onlyEntry?.sub !== null && onlyEntry?.sub !== undefined);

            return (
              <div key={gi} style={{
                background: `linear-gradient(135deg, ${catColor}0f 0%, rgba(255,255,255,0.018) 60%)`,
                border: `0.5px solid ${catColor}28`,
                borderRadius: 6, padding: '8px 10px',
                display: 'flex', gap: 10, alignItems: 'flex-start',
                opacity: 1 - gi * 0.06,
              }}>
                <AppIcon app={group.app} rawTitle={group.rawTitle} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* App name row */}
                  <div style={{
                    fontSize: 11, fontWeight: 500, color: '#e5e5e5',
                    letterSpacing: '-0.005em',
                    marginBottom: showSubRows ? 4 : 0,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {group.app}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      {/* Active indicator dot — most recent group only */}
                      {isActive && (
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: '#4ade80',
                          boxShadow: '0 0 5px 1px rgba(74,222,128,0.6)',
                          display: 'inline-block', flexShrink: 0,
                        }} />
                      )}
                      {/* Duration in header only when single entry with no sub-label */}
                      {isSingle && !onlyEntry?.sub && (
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10, fontVariantNumeric: 'tabular-nums',
                          color: onlyEntry.isFirst && onlyEntry.durationSec < 30 ? catColor : '#737373',
                        }}>
                          {fmtDur(onlyEntry.durationSec, onlyEntry.isFirst)}
                        </span>
                      )}
                    </span>
                  </div>
                  {/* Sub-rows */}
                  {showSubRows && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {group.entries.map((e, ei) => (
                        <div key={ei} style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'baseline', gap: 8, fontSize: 10,
                        }}>
                          <span style={{
                            color: '#a3a3a3', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            flex: 1, minWidth: 0,
                          }}>
                            {e.sub ?? '·'}
                          </span>
                          <span style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9.5, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                            color: e.isFirst && e.durationSec < 30 ? catColor : '#737373',
                          }}>
                            {fmtDur(e.durationSec, e.isFirst)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ padding: '10px 16px 14px', borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6 }}>
        <button
          onClick={() => window.electronAPI.endSession()}
          style={{
            flex: 1, background: 'transparent',
            border: '0.5px solid rgba(248,113,113,0.3)',
            borderRadius: 5, padding: '8px 0',
            fontSize: 11, color: '#f87171',
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          end session
        </button>
      </div>

      {/* Ghost mascot */}
      <div style={{ position: 'absolute', bottom: 58, right: 12, pointerEvents: 'none', transition: 'opacity 0.3s' }}>
        <GhostMascot state={sessionUpdate.ghostState} size={40} />
      </div>
    </div>
  );
}
