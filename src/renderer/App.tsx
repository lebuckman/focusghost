import { useEffect, useRef, useState } from 'react';
import TaskDeclaration from './screens/TaskDeclaration';
import ActiveSession   from './screens/ActiveSession';
import GhostChat       from './screens/GhostChat';
import SessionRecap    from './screens/SessionRecap';
import Settings        from './screens/Settings';
import NudgePopup from './components/NudgePopup';
import NudgeView  from './screens/NudgeView';
import type { SessionRecapPayload, NudgePayload, SessionUpdate, OpenGhostChatPayload, AppSettings } from '../shared/ipc-contract';
import { IPC, DEFAULT_SETTINGS } from '../shared/ipc-contract';

const isNudgeView = new URLSearchParams(window.location.search).get('view') === 'nudge';

const ACCENT_MAP: Record<AppSettings['accentColor'], string> = {
  teal:   '#2dd4bf',
  violet: '#a78bfa',
  amber:  '#facc15',
};

// ─── Custom frameless title bar ───────────────────────────────────────────────

function TitleBar({ alwaysOnTop }: { alwaysOnTop: boolean }) {
  return (
    <div style={{
      height: 30, background: '#111111', flexShrink: 0,
      display: 'flex', alignItems: 'center',
      paddingLeft: 65, paddingRight: 20,
      position: 'relative',
    }}>
      <span style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        fontSize: 10, color: '#737373', fontWeight: 500,
        letterSpacing: '0.04em',
      }}>
        focusghost
      </span>
      {alwaysOnTop && (
        <span style={{ fontSize: 9, color: '#525252', letterSpacing: '0.04em', marginLeft: 'auto' }}>
          ◉ pinned
        </span>
      )}
    </div>
  );
}

type Screen = 'declare' | 'session' | 'chat' | 'recap' | 'settings';

export default function App() {
  const [screen,      setScreen]      = useState<Screen>('declare');
  const [prevScreen,  setPrevScreen]  = useState<Screen>('declare');
  const [recap,       setRecap]       = useState<SessionRecapPayload | null>(null);
  const [activeTask,  setActiveTask]  = useState('');
  const [activeMins,  setActiveMins]  = useState(30);
  const [nudge,       setNudge]       = useState<NudgePayload | null>(null);
  const [chatTrigger, setChatTrigger] = useState<string | undefined>(undefined);
  const [settings,    setSettings]    = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  const [collapsed,   setCollapsed]   = useState(false);
  const dimTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDimRef = useRef(settings.autoDim);
  const [sessionUpdate, setSessionUpdate] = useState<SessionUpdate>({
    currentApp: '', currentAppProcess: '', currentAppBundle: '', currentAppTitle: '',
    category: 'unknown', switchCount: 0, elapsedSec: 0, focusSec: 0, driftSec: 0,
    ghostState: 'calm', recentSwitches: [],
  });

  const accent = ACCENT_MAP[settings.accentColor] ?? '#2dd4bf';

  // ── Window collapse/expand ────────────────────────────────────────────────────
  const collapse = () => { setCollapsed(true);  window.electronAPI.collapseWindow(); };
  const expand   = () => { setCollapsed(false); window.electronAPI.expandWindow();   };

  // Keep ref in sync so event-handler closures always see the current value
  useEffect(() => { autoDimRef.current = settings.autoDim; }, [settings.autoDim]);

  // ── Auto-dim: make window see-through after 5s of no interaction ─────────────
  useEffect(() => {
    if (isNudgeView) return;

    const applyDim = (on: boolean) => {
      if (autoDimRef.current) window.electronAPI.setWindowDim(on);
    };
    const startDimTimer = () => {
      if (dimTimer.current) clearTimeout(dimTimer.current);
      dimTimer.current = setTimeout(() => applyDim(true), 5000);
    };
    const restore = () => { applyDim(false); startDimTimer(); };

    startDimTimer();
    window.addEventListener('mousemove',    restore);
    window.addEventListener('mousedown',    restore);
    window.addEventListener('keydown',      restore);
    document.addEventListener('mouseenter', restore); // fires on cursor entering the window boundary
    return () => {
      if (dimTimer.current) clearTimeout(dimTimer.current);
      window.removeEventListener('mousemove',    restore);
      window.removeEventListener('mousedown',    restore);
      window.removeEventListener('keydown',      restore);
      document.removeEventListener('mouseenter', restore);
    };
  }, []);

  // When autoDim is toggled off, immediately restore the window
  useEffect(() => {
    if (isNudgeView || settings.autoDim) return;
    window.electronAPI.setWindowDim(false);
  }, [settings.autoDim]);

  // Force restore on nudge or recap; restart dim timer after
  useEffect(() => {
    if (!nudge && screen !== 'recap') return;
    window.electronAPI.setWindowDim(false);
    if (dimTimer.current) clearTimeout(dimTimer.current);
    dimTimer.current = setTimeout(() => {
      if (autoDimRef.current) window.electronAPI.setWindowDim(true);
    }, 5000);
  }, [nudge, screen]);

  // ── Load persisted settings on mount ─────────────────────────────────────────
  useEffect(() => {
    if (isNudgeView) return;
    window.electronAPI.getSettings().then(s => {
      if (s) setSettings(prev => ({ ...prev, ...(s as Partial<AppSettings>) }));
    });
  }, []);

  // ── IPC listeners ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isNudgeView) return;
    window.electronAPI.onNudge((d) => setNudge(d as NudgePayload));
    window.electronAPI.onNudgeDismissed(() => setNudge(null));
    window.electronAPI.onOpenGhostChat((d) => {
      const payload = d as OpenGhostChatPayload;
      setChatTrigger(payload?.trigger);
      setScreen('chat');
      // Always expand so the chat screen renders in the full window
      setCollapsed(false);
      window.electronAPI.expandWindow();
    });
    window.electronAPI.onSessionUpdate((d) => setSessionUpdate(d as SessionUpdate));
    window.electronAPI.onSessionRecap((d) => {
      setRecap(d as SessionRecapPayload);
      setScreen('recap');
      // Restore full window for the recap screen
      setCollapsed(false);
      window.electronAPI.expandWindow();
    });
    return () => {
      window.electronAPI.removeAllListeners(IPC.TRIGGER_NUDGE);
      window.electronAPI.removeAllListeners(IPC.NUDGE_DISMISSED);
      window.electronAPI.removeAllListeners(IPC.OPEN_GHOST_CHAT);
      window.electronAPI.removeAllListeners(IPC.SESSION_UPDATE);
      window.electronAPI.removeAllListeners(IPC.SESSION_RECAP);
    };
  }, []);

  // ── Auto-collapse: collapse after 30s of no user interaction with the app ────
  const autoCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!settings.autoCollapse || screen !== 'session' || collapsed) return;

    const resetTimer = () => {
      if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
      autoCollapseTimer.current = setTimeout(() => collapse(), 30_000);
    };

    resetTimer();
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('keydown',   resetTimer);
    return () => {
      if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('keydown',   resetTimer);
    };
  }, [settings.autoCollapse, screen, collapsed]);

  // ── Navigation helpers ────────────────────────────────────────────────────────
  const dismissNudge = () => { window.electronAPI.dismissNudge(); setNudge(null); };

  const openChat = () => {
    setChatTrigger(undefined);
    setScreen('chat');
    if (collapsed) expand();
  };

  const openSettings = (from: Screen) => {
    setPrevScreen(from);
    setScreen('settings');
    if (collapsed) expand();
  };

  const handleSettingsChange = (patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
    window.electronAPI.updateSettings(patch);
  };

  const remainingSec = Math.max(0, activeMins * 60 - sessionUpdate.elapsedSec);

  if (isNudgeView) return <NudgeView />;

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', background: '#111111', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <TitleBar alwaysOnTop={settings.alwaysOnTop} />
      <div style={{ flex: 1, minHeight: 0, position: 'relative', background: '#111111', overflow: 'hidden' }}>
        {screen === 'declare' && (
          <TaskDeclaration
            onStart={(task, durationMin) => {
              setActiveTask(task);
              setActiveMins(durationMin);
              setScreen('session');
            }}
            onOpenSettings={() => openSettings('declare')}
            accent={accent}
          />
        )}
        {screen === 'session' && (
          <ActiveSession
            task={activeTask}
            durationMin={activeMins}
            sessionUpdate={sessionUpdate}
            onOpenChat={openChat}
            onOpenSettings={() => openSettings('session')}
            collapsed={collapsed}
            onCollapse={collapse}
            onExpand={expand}
            accent={accent}
          />
        )}
        {screen === 'chat' && (
          <GhostChat
            task={activeTask}
            trigger={chatTrigger}
            onBack={() => { setChatTrigger(undefined); setScreen('session'); }}
            onOpenSettings={() => openSettings('chat')}
            onCollapse={() => { setChatTrigger(undefined); setScreen('session'); collapse(); }}
            accent={accent}
          />
        )}
        {screen === 'recap' && recap && (
          <SessionRecap
            recap={recap}
            onNewSession={() => { setRecap(null); setScreen('declare'); }}
            onOpenSettings={() => openSettings('recap')}
            accent={accent}
          />
        )}
        {screen === 'settings' && (
          <Settings
            settings={settings}
            onBack={() => setScreen(prevScreen)}
            onChange={handleSettingsChange}
          />
        )}

        {nudge && (
          <NudgePopup
            nudge={nudge}
            task={activeTask}
            investedSec={sessionUpdate.elapsedSec}
            remainingSec={remainingSec}
            onDismiss={dismissNudge}
            onStuck={() => { dismissNudge(); openChat(); }}
            onEndSession={() => { dismissNudge(); window.electronAPI.endSession(); }}
            accent={accent}
          />
        )}
      </div>
    </div>
  );
}
