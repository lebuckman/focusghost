/// <reference types="svelte" />
/// <reference types="vite/client" />

import type {
  FocusGhostAPI,
  RendererEventChannel,
  RendererEventPayload,
} from "@shared/types"

interface FGEventBridge {
  on<C extends RendererEventChannel>(
    channel: C,
    handler: (payload: RendererEventPayload<C>) => void
  ): () => void
}

declare global {
  interface Window {
    fg: FocusGhostAPI
    fgEvents: FGEventBridge
  }
}

export {}
