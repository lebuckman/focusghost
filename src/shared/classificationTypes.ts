export type ActivityCategory =
  | 'focus'
  | 'supportive'
  | 'neutral'
  | 'distraction'
  | 'hard-distraction'
  | 'needs-clarification';

export type SessionType = 'coding' | 'writing' | 'study' | 'design' | 'general';

export interface ClassificationResult {
  category: ActivityCategory;
  sessionType: SessionType;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface SessionCorrection {
  isBrowser: boolean;
  appName?: string;    // non-browser: exact OS app name
  siteName?: string;   // browser: canonical site key (e.g. "youtube", "github")
  titleKeywords: string[]; // meaningful words — at least one must match for browser corrections
  category: 'focus' | 'distraction';
}

export interface ClassifyActivityInput {
  sessionGoal: string;
  appName: string;
  bundleId: string;
  windowTitle: string; // raw OS window title
  tabTitle: string;    // for browsers: tab portion only; for others: same as appName
  sessionCorrections: SessionCorrection[];
}

export interface ClarificationPayload {
  isBrowser: boolean;
  appName?: string;
  siteName?: string;
  titleKeywords: string[];
}
