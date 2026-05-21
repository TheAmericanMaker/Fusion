import { describe, expect, it } from "vitest";
import { buildManualRetryResetPatch, getPrimaryPrInfo } from "../task-helpers.js";
describe("getPrimaryPrInfo", () => {
  it("returns prInfo when only legacy field is set", () => {
    const prInfo = { number: 1 } as any;
    expect(getPrimaryPrInfo({ prInfo })).toBe(prInfo);
  });

  it("returns first prInfos entry when only prInfos is set", () => {
    const first = { number: 2 } as any;
    const second = { number: 3 } as any;
    expect(getPrimaryPrInfo({ prInfos: [first, second] })).toBe(first);
  });

  it("prefers prInfos[0] when both fields are set", () => {
    const prInfo = { number: 1 } as any;
    const first = { number: 2 } as any;
    expect(getPrimaryPrInfo({ prInfo, prInfos: [first] })).toBe(first);
  });

  it("returns undefined when neither field is set", () => {
    expect(getPrimaryPrInfo({})).toBeUndefined();
  });
});

describe("buildManualRetryResetPatch", () => {
  it("resets only manual retry counters", () => {
    expect(buildManualRetryResetPatch()).toEqual({
      taskDoneRetryCount: 0,
      workflowStepRetries: 0,
      stuckKillCount: 0,
    });
  });
});
