interface RenderTrackerState {
  counts: Record<string, number>;
}

declare global {
  var __KIKS_RENDER_TRACKER__: RenderTrackerState | undefined;
}

function getRenderTrackerState(): RenderTrackerState | null {
  if (typeof globalThis === "undefined") {
    return null;
  }

  return globalThis.__KIKS_RENDER_TRACKER__ ?? null;
}

/**
 * Используется benchmark-сценарием для фиксации факта перерисовки логической зоны интерфейса.
 */
export function trackRender(zone: string): void {
  const tracker = getRenderTrackerState();

  if (!tracker) {
    return;
  }

  tracker.counts[zone] = (tracker.counts[zone] ?? 0) + 1;
}
