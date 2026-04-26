const BROWSER_SUFFIXES = [
  ' - Google Chrome',
  ' - Chrome',
  ' - Mozilla Firefox',
  ' - Firefox',
  ' - Microsoft Edge',
  ' - Edge',
  ' - Safari',
  ' - Arc',
  ' - Brave Browser',
  ' - Opera',
  ' - Zen Browser',
  ' - Zen',
];

const BROWSER_NAMES = [
  'Google Chrome', 'Chrome', 'Mozilla Firefox', 'Firefox',
  'Microsoft Edge', 'Safari', 'Arc', 'Brave Browser', 'Opera',
  'Zen Browser', 'Zen',
];

export function extractTabTitle(
  windowTitle: string,
  appName: string,
): string {
  if (!windowTitle) return appName;

  const isBrowser = BROWSER_NAMES.some(b =>
    appName.toLowerCase().includes(b.toLowerCase()),
  );
  if (!isBrowser) return appName;

  // Try longest suffixes first to correctly handle nested suffixes like
  // "My Doc - Google Docs - Google Chrome"
  const sorted = [...BROWSER_SUFFIXES].sort((a, b) => b.length - a.length);
  for (const suffix of sorted) {
    if (windowTitle.endsWith(suffix)) {
      const tabTitle = windowTitle.slice(0, -suffix.length).trim();
      if (tabTitle.length > 1) return tabTitle;
    }
  }

  return appName;
}
