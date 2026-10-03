declare module 'claude-code' {
  // biome-ignore lint/style/useConsistentTypeDefinitions: claude-code の PluginState に宣言をマージするので type alias にできない
  interface PluginState {
    'general-dev-mods': {
      lastTurnEndedAt: number;
      phase: 'ice' | 'compacting' | 'rebuilt';
      iceTokens: number;
      contextWindow: number;
    };
  }
}
