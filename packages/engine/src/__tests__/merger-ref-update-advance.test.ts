import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { advanceIntegrationBranchRef } from "../merger-ref-update-advance.js";

function git(cwd: string, cmd: string): string {
  return execSync(cmd, { cwd, stdio: "pipe", encoding: "utf-8" }).trim();
}

function setupRepo(defaultBranch: "main" | "master" = "main") {
  const dir = mkdtempSync(join(tmpdir(), "fusion-test-ref-advance-"));
  git(dir, `git init -b ${defaultBranch}`);
  git(dir, "git config user.name tester");
  git(dir, "git config user.email tester@example.com");
  writeFileSync(join(dir, "tracked.txt"), "one\n");
  git(dir, "git add tracked.txt");
  git(dir, "git commit -m init");
  return dir;
}

describe("advanceIntegrationBranchRef", () => {
  it.each(["main", "master"] as const)("advances %s via update-ref happy path", async (integrationBranch) => {
    const dir = setupRepo(integrationBranch);
    const events: Array<{ type: string; target?: string; metadata?: Record<string, unknown> }> = [];
    try {
      const expectedCurrentSha = git(dir, `git rev-parse refs/heads/${integrationBranch}`);
      git(dir, "git checkout -b feat");
      writeFileSync(join(dir, "feature.txt"), "feature\n");
      git(dir, "git add feature.txt");
      git(dir, "git commit -m feat");
      const newSha = git(dir, "git rev-parse HEAD");

      const result = await advanceIntegrationBranchRef({
        rootDir: dir,
        projectRootDir: dir,
        integrationBranch,
        newSha,
        expectedCurrentSha,
        taskId: "FN-5350",
        audit: {
          git: async (event: any) => events.push(event),
        } as any,
      });

      expect(result).toEqual({ advanced: true, previousSha: expectedCurrentSha, newSha });
      expect(git(dir, `git rev-parse refs/heads/${integrationBranch}`)).toBe(newSha);
      expect(events[0]?.type).toBe("merge:integration-ref-advance");
      expect(events[0]?.metadata?.advanceMode).toBe("update-ref");
      expect(events[0]?.metadata?.succeeded).toBe(true);
      expect(events[0]?.metadata?.refName).toBe(`refs/heads/${integrationBranch}`);
      expect(events[0]?.target).toBe(integrationBranch);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns concurrent-advance when observed tip differs from expected", async () => {
    const dir = setupRepo("main");
    const events: Array<{ type: string; metadata?: Record<string, unknown> }> = [];
    try {
      const staleExpectedSha = git(dir, "git rev-parse refs/heads/main");
      git(dir, "git checkout -b other");
      writeFileSync(join(dir, "other.txt"), "other\n");
      git(dir, "git add other.txt");
      git(dir, "git commit -m other");
      const observedCurrentSha = git(dir, "git rev-parse HEAD");
      git(dir, `git update-ref refs/heads/main ${observedCurrentSha} ${staleExpectedSha}`);

      git(dir, "git checkout -b feat2");
      writeFileSync(join(dir, "feature2.txt"), "feature2\n");
      git(dir, "git add feature2.txt");
      git(dir, "git commit -m feat2");
      const newSha = git(dir, "git rev-parse HEAD");

      const result = await advanceIntegrationBranchRef({
        rootDir: dir,
        projectRootDir: dir,
        integrationBranch: "main",
        newSha,
        expectedCurrentSha: staleExpectedSha,
        taskId: "FN-5350",
        audit: {
          git: async (event: any) => events.push(event),
        } as any,
      });

      expect(result.advanced).toBe(false);
      if (result.advanced) throw new Error("expected refusal");
      expect(result.reason).toBe("concurrent-advance");
      expect(result.observedCurrentSha).toBe(observedCurrentSha);
      expect(git(dir, "git rev-parse refs/heads/main")).toBe(observedCurrentSha);
      expect(events[0]?.type).toBe("merge:integration-ref-advance");
      expect(events[0]?.metadata?.succeeded).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps dirty and untracked files untouched while advancing", async () => {
    const dir = setupRepo("main");
    try {
      const expectedCurrentSha = git(dir, "git rev-parse refs/heads/main");
      git(dir, "git checkout -b feat");
      writeFileSync(join(dir, "feature.txt"), "feature\n");
      git(dir, "git add feature.txt");
      git(dir, "git commit -m feat");
      const newSha = git(dir, "git rev-parse HEAD");
      git(dir, "git checkout main");

      writeFileSync(join(dir, "tracked.txt"), "one\nuser-local-edit\n");
      writeFileSync(join(dir, "untracked.txt"), "untracked\n");
      const trackedBefore = readFileSync(join(dir, "tracked.txt"), "utf-8");
      const untrackedBefore = readFileSync(join(dir, "untracked.txt"), "utf-8");

      const result = await advanceIntegrationBranchRef({
        rootDir: dir,
        projectRootDir: dir,
        integrationBranch: "main",
        newSha,
        expectedCurrentSha,
        taskId: "FN-5350",
        audit: { git: async () => undefined } as any,
      });

      expect(result.advanced).toBe(true);
      expect(readFileSync(join(dir, "tracked.txt"), "utf-8")).toBe(trackedBefore);
      expect(readFileSync(join(dir, "untracked.txt"), "utf-8")).toBe(untrackedBefore);
      expect(existsSync(join(dir, "untracked.txt"))).toBe(true);
      const status = git(dir, "git status --porcelain");
      expect(status).toContain("tracked.txt");
      expect(status).toContain("untracked.txt");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws on missing precondition shas", async () => {
    const dir = setupRepo("main");
    try {
      await expect(advanceIntegrationBranchRef({
        rootDir: dir,
        projectRootDir: dir,
        integrationBranch: "main",
        newSha: "",
        expectedCurrentSha: "abc",
        taskId: "FN-5350",
        audit: { git: async () => undefined } as any,
      })).rejects.toThrow("newSha");

      await expect(advanceIntegrationBranchRef({
        rootDir: dir,
        projectRootDir: dir,
        integrationBranch: "main",
        newSha: "abc",
        expectedCurrentSha: "",
        taskId: "FN-5350",
        audit: { git: async () => undefined } as any,
      })).rejects.toThrow("expectedCurrentSha");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
