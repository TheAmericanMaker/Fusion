import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { installTaskWorktreeIdentityGuard } from "../../worktree-hooks.js";

function git(dir: string, cmd: string): string {
  return execSync(cmd, { cwd: dir, stdio: "pipe" }).toString().trim();
}

describe("commit-msg trailer hook (real git)", () => {
  it("appends and preserves Fusion-Task-Id trailer in fusion worktrees", async () => {
    const rootDir = mkdtempSync(join(tmpdir(), "fn-5089-commit-msg-"));
    const worktreeDir = join(rootDir, "wt-kb");

    try {
      git(rootDir, "git init -b main");
      git(rootDir, 'git config user.email "test@example.com"');
      git(rootDir, 'git config user.name "Test"');
      writeFileSync(join(rootDir, "README.md"), "init\n");
      git(rootDir, "git add README.md && git commit -m 'init'");

      git(rootDir, "git worktree add -b fusion/kb-7 wt-kb HEAD");
      await installTaskWorktreeIdentityGuard({
        worktreePath: worktreeDir,
        taskId: "KB-7",
        taskPrefix: "KB",
        taskAttributionTrailerName: "Fusion-Task-Id",
      });

      // FN-5345/FN-5377: pre-commit hook now refuses empty commits in fusion
      // worktrees, so this test stages a real file change for each commit
      // instead of using --allow-empty. The trailer-hook behavior under test
      // is unchanged.
      writeFileSync(join(worktreeDir, "step1.txt"), "first\n");
      git(worktreeDir, "git add step1.txt && git commit -m 'feat(KB-7): first'");
      const firstBody = git(worktreeDir, "git log -1 --format=%B");
      expect(firstBody).toContain("Fusion-Task-Id: KB-7");
      const firstTrailers = git(worktreeDir, "git log -1 --format=%B | git interpret-trailers --parse");
      expect(firstTrailers).toContain("Fusion-Task-Id: KB-7");

      git(worktreeDir, "git commit --amend --no-edit");
      const amendNoEditBody = git(worktreeDir, "git log -1 --format=%B");
      expect((amendNoEditBody.match(/Fusion-Task-Id:\s*KB-7/g) ?? []).length).toBe(1);

      git(worktreeDir, "git commit --amend -m 'feat(KB-7): rewritten'");
      const rewrittenBody = git(worktreeDir, "git log -1 --format=%B");
      expect(rewrittenBody).toContain("feat(KB-7): rewritten");
      expect((rewrittenBody.match(/Fusion-Task-Id:\s*KB-7/g) ?? []).length).toBe(1);

      const taskFile = git(worktreeDir, "git rev-parse --git-path fusion-task-id");
      writeFileSync(isAbsolute(taskFile) ? taskFile : resolve(worktreeDir, taskFile), "kb-7\n");
      writeFileSync(join(worktreeDir, "step2.txt"), "lowercase\n");
      git(worktreeDir, "git add step2.txt && git commit -m 'feat(KB-7): lowercase metadata'");
      const lowercaseBody = git(worktreeDir, "git log -1 --format=%B");
      expect(lowercaseBody).toContain("Fusion-Task-Id: KB-7");

      writeFileSync(join(rootDir, "outside.txt"), "outside\n");
      git(rootDir, "git add outside.txt && git commit -m 'chore: root commit'");
      const rootBody = git(rootDir, "git log -1 --format=%B");
      expect(rootBody).not.toContain("Fusion-Task-Id:");
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  }, 30_000);
});
