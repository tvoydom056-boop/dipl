import type { TaskState } from "./taskModel";

/**
 * Результат выполнения операции над временной шкалой.
 */
export interface TimelineState {
  timeline: TaskState[];
  pointer: number;
}

/**
 * Добавляет новое состояние в историю и отсекает "будущее".
 */
export function pushHistory(
  timeline: TaskState[],
  pointer: number,
  nextState: TaskState,
  limit = 20,
): TimelineState {
  const nextTimeline = timeline.slice(0, pointer + 1);
  nextTimeline.push(nextState);

  if (nextTimeline.length > limit) {
    const overflow = nextTimeline.length - limit;

    return {
      timeline: nextTimeline.slice(overflow),
      pointer: limit - 1,
    };
  }

  return {
    timeline: nextTimeline,
    pointer: nextTimeline.length - 1,
  };
}
