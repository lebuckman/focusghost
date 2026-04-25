import React, { useState } from 'react';
import TaskDeclaration from './screens/TaskDeclaration';
import ActiveSession   from './screens/ActiveSession';
import GhostChat       from './screens/GhostChat';
import SessionRecap    from './screens/SessionRecap';
import type { SessionRecapPayload } from '../shared/ipc-contract';

type Screen = 'declare' | 'session' | 'chat' | 'recap';

export default function App() {
  const [screen,      setScreen]      = useState<Screen>('declare');
  const [recap,       setRecap]       = useState<SessionRecapPayload | null>(null);
  const [activeTask,  setActiveTask]  = useState('');
  const [activeMins,  setActiveMins]  = useState(30);

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', background: '#111111', fontFamily: "'Inter', sans-serif" }}>
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
          onOpenChat={() => setScreen('chat')}
          onRecap={(data) => { setRecap(data); setScreen('recap'); }}
        />
      )}
      {screen === 'chat' && (
        <GhostChat onBack={() => setScreen('session')} />
      )}
      {screen === 'recap' && recap && (
        <SessionRecap
          recap={recap}
          onNewSession={() => { setRecap(null); setScreen('declare'); }}
        />
      )}
    </div>
  );
}
