import { useEffect, useState } from 'react';
import TaskDeclaration from './screens/TaskDeclaration';
import ActiveSession   from './screens/ActiveSession';
import GhostChat       from './screens/GhostChat';
import SessionRecap    from './screens/SessionRecap';
import NudgePopup from './components/NudgePopup';
import NudgeView  from './screens/NudgeView';
import type { SessionRecapPayload, NudgePayload, SessionUpdate } from '../shared/ipc-contract';
import { MOCK_SESSION_UPDATE, IPC } from '../shared/ipc-contract';

const isNudgeView = new URLSearchParams(window.location.search).get('view') === 'nudge';

type Screen = 'declare' | 'session' | 'chat' | 'recap';

export default function App() {
  const [screen,     setScreen]     = useState<Screen>('declare');
  const [recap,      setRecap]      = useState<SessionRecapPayload | null>(null);
  const [activeTask, setActiveTask] = useState('');
  const [activeMins, setActiveMins] = useState(30);
  const [nudge,      setNudge]      = useState<NudgePayload | null>(null);
  const [sessionUpdate, setSessionUpdate] = useState<SessionUpdate>(MOCK_SESSION_UPDATE);

  useEffect(() => {
    if (isNudgeView) return; // NudgeView handles its own IPC
    window.electronAPI.onNudge((d) => setNudge(d as NudgePayload));
    window.electronAPI.onNudgeDismissed(() => setNudge(null));
    window.electronAPI.onOpenGhostChat(() => setScreen('chat'));
    window.electronAPI.onSessionUpdate((d) => setSessionUpdate(d as SessionUpdate));
    window.electronAPI.onSessionRecap((d) => {
      setRecap(d as SessionRecapPayload);
      setScreen('recap');
    });
    return () => {
      window.electronAPI.removeAllListeners(IPC.TRIGGER_NUDGE);
      window.electronAPI.removeAllListeners(IPC.NUDGE_DISMISSED);
      window.electronAPI.removeAllListeners(IPC.OPEN_GHOST_CHAT);
      window.electronAPI.removeAllListeners(IPC.SESSION_UPDATE);
      window.electronAPI.removeAllListeners(IPC.SESSION_RECAP);
    };
  }, []);

  const dismissNudge = () => {
    window.electronAPI.dismissNudge();
    setNudge(null);
  };

  const openChat = () => setScreen('chat');

  const remainingSec = Math.max(0, activeMins * 60 - sessionUpdate.elapsedSec);

  // Interrupt nudge window — renders NudgeView only, no main UI
  if (isNudgeView) return <NudgeView />;

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', background: '#111111', fontFamily: "'Inter', sans-serif", position: 'relative' }}>
      {screen === 'declare' && (
        <TaskDeclaration
          onStart={(task, durationMin) => {
            setActiveTask(task);
            setActiveMins(durationMin);
            setScreen('session');
          }}
        />
      )}
      {screen === 'session' && (
        <ActiveSession
          task={activeTask}
          durationMin={activeMins}
          sessionUpdate={sessionUpdate}
          onOpenChat={openChat}
        />
      )}
      {screen === 'chat' && (
        <GhostChat
          task={activeTask}
          onBack={() => setScreen('session')}
        />
      )}
      {screen === 'recap' && recap && (
        <SessionRecap
          recap={recap}
          onNewSession={() => { setRecap(null); setScreen('declare'); }}
        />
      )}

      {/* Check-in nudge — main window resized to 200px, NudgePopup fills it */}
      {nudge && (
        <NudgePopup
          nudge={nudge}
          task={activeTask}
          investedSec={sessionUpdate.elapsedSec}
          remainingSec={remainingSec}
          onDismiss={dismissNudge}
          onStuck={() => { dismissNudge(); openChat(); }}
          onEndSession={() => { dismissNudge(); window.electronAPI.endSession(); }}
        />
      )}
    </div>
  );
}
