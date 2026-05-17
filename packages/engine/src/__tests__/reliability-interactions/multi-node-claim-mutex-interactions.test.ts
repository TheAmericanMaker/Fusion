import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { AgentStore, CheckoutConflictError, TaskStore } from "@fusion/core";

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), "fn-multi-node-claim-mutex-"));
}

describe("reliability interactions: multi-node claim mutex", () => {
  let rootDir = "";
  let globalDir = "";
  let taskStore: TaskStore;
  let agentStoreA: AgentStore;
  let agentStoreB: AgentStore;
  let agentAId = "";
  let agentBId = "";
  let taskId = "";

  beforeEach(async () => {
    rootDir = makeTmpDir();
    globalDir = join(rootDir, ".fusion-global");
    taskStore = new TaskStore(rootDir, globalDir);
    await taskStore.init();
    agentStoreA = new AgentStore({ rootDir, taskStore });
    agentStoreB = new AgentStore({ rootDir, taskStore });
    await agentStoreA.init();
    await agentStoreB.init();

    agentAId = (await agentStoreA.createAgent({ name: "exec-a", role: "executor" })).id;
    agentBId = (await agentStoreA.createAgent({ name: "exec-b", role: "executor" })).id;
    taskId = (await taskStore.createTask({ description: "FN-4813 reliability interaction" })).id;
  });

  afterEach(async () => {
    agentStoreA?.close();
    agentStoreB?.close();
    taskStore?.close();
    await rm(rootDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  });

  it("FN-4813: distributed claim mutex split-brain prevention + renewal + stale peer reject + release handoff", async () => {
    // FN-4813: distributed claim mutex split-brain prevention
    const firstClaim = await Promise.allSettled([
      agentStoreA.checkoutTask(agentAId, taskId, { nodeId: "node-a", runId: "run-a-1" }),
      agentStoreB.checkoutTask(agentBId, taskId, { nodeId: "node-b", runId: "run-b-1" }),
    ]);

    const fulfilled = firstClaim.filter((entry): entry is PromiseFulfilledResult<Awaited<ReturnType<AgentStore["checkoutTask"]>>> => entry.status === "fulfilled");
    const rejected = firstClaim.filter((entry): entry is PromiseRejectedResult => entry.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(CheckoutConflictError);

    const winner = fulfilled[0].value;
    const loserAgentId = winner.checkedOutBy === agentAId ? agentBId : agentAId;
    const loserNodeId = winner.checkoutNodeId === "node-a" ? "node-b" : "node-a";

    const claimed = await taskStore.getTask(taskId);
    expect(claimed?.checkedOutBy).toBe(winner.checkedOutBy);
    expect(claimed?.checkoutNodeId).toBe(winner.checkoutNodeId);
    expect(claimed?.checkoutLeaseEpoch).toBeGreaterThan(0);
    expect(claimed?.checkedOutBy).not.toBe(loserAgentId);
    expect(claimed?.checkoutNodeId).not.toBe(loserNodeId);

    const epochAfterClaim = claimed?.checkoutLeaseEpoch ?? 0;
    const renewedAtBefore = claimed?.checkoutLeaseRenewedAt ?? "";
    const renewalAgentStore = winner.checkedOutBy === agentAId ? agentStoreA : agentStoreB;

    // FN-4813: owner renewal with matching epoch updates renewedAt without epoch bump
    const renewed = await renewalAgentStore.checkoutTask(winner.checkedOutBy!, taskId, {
      nodeId: winner.checkoutNodeId!,
      runId: "run-renew",
      leaseEpoch: epochAfterClaim,
      renewedAt: "2026-05-16T00:00:00.000Z",
    });
    expect(renewed.checkoutLeaseEpoch).toBe(epochAfterClaim);
    expect(renewed.checkoutLeaseRenewedAt).toBe("2026-05-16T00:00:00.000Z");
    expect(renewed.checkoutLeaseRenewedAt).not.toBe(renewedAtBefore);

    // FN-4813: stale epoch peer claim must conflict and preserve ownership
    const peerStore = winner.checkedOutBy === agentAId ? agentStoreB : agentStoreA;
    const peerAgentId = winner.checkedOutBy === agentAId ? agentBId : agentAId;
    const peerNodeId = winner.checkoutNodeId === "node-a" ? "node-b" : "node-a";
    await expect(
      peerStore.checkoutTask(peerAgentId, taskId, { nodeId: peerNodeId, leaseEpoch: 0, runId: "run-peer-stale" }),
    ).rejects.toBeInstanceOf(CheckoutConflictError);

    const afterStalePeer = await taskStore.getTask(taskId);
    expect(afterStalePeer?.checkedOutBy).toBe(winner.checkedOutBy);
    expect(afterStalePeer?.checkoutNodeId).toBe(winner.checkoutNodeId);
    expect(afterStalePeer?.checkoutLeaseEpoch).toBe(epochAfterClaim);

    // FN-4813: recovery handoff after release
    await taskStore.updateTask(taskId, {
      checkedOutBy: null,
      checkedOutAt: null,
      checkoutNodeId: null,
      checkoutRunId: null,
      checkoutLeaseRenewedAt: null,
    });

    const reclaimedByB = await agentStoreB.checkoutTask(agentBId, taskId, { nodeId: "node-b", runId: "run-b-3" });
    expect(reclaimedByB.checkedOutBy).toBe(agentBId);
    expect(reclaimedByB.checkoutNodeId).toBe("node-b");
    expect(reclaimedByB.checkoutLeaseEpoch).toBe(epochAfterClaim + 1);
  });

  it("FN-4813: preserves legacy CheckoutConflictError fields for non-node-aware callsites", async () => {
    // FN-4813: legacy checkout conflict contract remains intact
    await agentStoreA.checkoutTask(agentAId, taskId);

    const thrown = await agentStoreA.checkoutTask(agentBId, taskId).catch((error) => error);
    expect(thrown).toBeInstanceOf(CheckoutConflictError);
    const conflict = thrown as CheckoutConflictError;
    expect(conflict.taskId).toBe(taskId);
    expect(conflict.currentHolderId).toBe(agentAId);
    expect(conflict.requestedById).toBe(agentBId);

    const persisted = await taskStore.getTask(taskId);
    expect(persisted?.checkedOutBy).toBe(agentAId);
    expect(persisted?.checkoutNodeId ?? null).toBeNull();
    expect(persisted?.checkoutLeaseEpoch ?? 0).toBe(1);
  });
});
