import type { PrInfo, Task } from "./types.js";

export function getPrimaryPrInfo(task: Pick<Task, "prInfo" | "prInfos">): PrInfo | undefined {
  return task.prInfos?.[0] ?? task.prInfo;
}

export function buildManualRetryResetPatch(): Pick<Task, "taskDoneRetryCount" | "workflowStepRetries" | "stuckKillCount"> {
  return {
    taskDoneRetryCount: 0,
    workflowStepRetries: 0,
    stuckKillCount: 0,
  };
}
