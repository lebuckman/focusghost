import React, { useState } from 'react';

type Screen = 'declare' | 'session' | 'chat' | 'recap';

export default function App() {
  const [screen, setScreen] = useState<Screen>('declare');

  return (
    <div className="w-full h-screen bg-ghost-bg text-white flex flex-col items-center justify-center gap-4 p-4">
      <div className="text-ghost-teal text-2xl font-bold">👻 FocusGhost</div>
      <div className="text-slate-400 text-sm">Stack is working. Current screen: {screen}</div>
      <div className="flex gap-2 flex-wrap justify-center">
        {(['declare','session','chat','recap'] as Screen[]).map(s => (
          <button
            key={s}
            onClick={() => setScreen(s)}
            className={`px-3 py-1 rounded text-sm border ${
              screen === s
                ? 'bg-ghost-teal text-black border-ghost-teal'
                : 'bg-ghost-surface text-slate-300 border-white/10'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
