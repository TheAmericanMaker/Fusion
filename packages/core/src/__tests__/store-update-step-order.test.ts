import { beforeAll, beforeEach, afterEach, afterAll, describe, expect, it } from "vitest";
import { createSharedTaskStoreTestHarness } from "./store-test-helpers.js";

describe("TaskStore.updateStep step-order guard", () => {
  const harness = createSharedTaskStoreTestHarness();

  beforeAll(harness.beforeAll);
  beforeEach(harness.beforeEach);
  afterEach(harness.afterEach);
  afterAll(harness.afterAll);

  it("no-ops out-of-order done updates when an earlier step is pending", async () => {
    const store = harness.store();
    const task = await harness.createTaskWithSteps();

    await store.updateStep(task.id, 0, "done");
    const updated = await store.updateStep(task.id, 2, "done");

    expect(updated.steps[2].status).toBe("pending");
    expect(updated.log.some((entry) => entry.action.includes("Ignored out-of-order done for step 2"))).toBe(true);
  });

  it("allows done when prior steps are skipped", async () => {
    const store = harness.store();
    const task = await harness.createTaskWithSteps();

    await store.updateStep(task.id, 0, "done");
    await store.updateStep(task.id, 1, "skipped");
    const updated = await store.updateStep(task.id, 2, "done");

    expect(updated.steps[2].status).toBe("done");
    expect(updated.currentStep).toBe(3);
  });

  it("allows done when prior steps are done and advances currentStep", async () => {
    const store = harness.store();
    const task = await harness.createTaskWithSteps();

    await store.updateStep(task.id, 0, "done");
    await store.updateStep(task.id, 1, "done");
    const updated = await store.updateStep(task.id, 2, "done");

    expect(updated.steps[2].status).toBe("done");
    expect(updated.currentStep).toBe(3);
  });

  it("keeps done→in-progress regression guard behavior", async () => {
    const store = harness.store();
    const task = await harness.createTaskWithSteps();

    await store.updateStep(task.id, 0, "done");
    const updated = await store.updateStep(task.id, 0, "in-progress");

    expect(updated.steps[0].status).toBe("done");
    expect(updated.log.some((entry) => entry.action.includes("Ignored done→in-progress regression"))).toBe(true);
  });
});
