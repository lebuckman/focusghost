import { useEffect, useState } from 'react';
import { NudgeContent } from '../components/NudgePopup';
import type { NudgePayload } from '../../shared/ipc-contract';

export default function NudgeView() {
  const [nudge, setNudge] = useState<NudgePayload | null>(null);

  useEffect(() => {
    window.electronAPI.onNudge((d) => setNudge(d as NudgePayload));
  }, []);

  const dismiss    = () => window.electronAPI.dismissNudge();
  const stuck      = () => window.electronAPI.dismissNudge();
  const endSession = () => { window.electronAPI.dismissNudge(); window.electronAPI.endSession(); };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#111111',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {nudge ? (
        <div style={{ width: '100%' }}>
          <NudgeContent
            nudge={nudge}
            task={nudge.context?.task ?? ''}
            investedSec={nudge.context?.investedSec ?? 0}
            remainingSec={nudge.context?.remainingSec ?? 0}
            onDismiss={dismiss}
            onStuck={stuck}
            onEndSession={endSession}
          />
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#525252', padding: 20 }}>...</div>
      )}
    </div>
  );
}
