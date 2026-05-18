import { describe, expect, it } from "vitest";

import { partitionConflictsByFileScope } from "../merger.js";

describe("partitionConflictsByFileScope", () => {
  it("treats empty declared scope as no enforcement", () => {
    const result = partitionConflictsByFileScope({
      conflictFiles: ["AGENTS.md", "packages/core/src/store.ts"],
      declaredScope: [],
    });

    expect(result).toEqual({
      inScope: ["AGENTS.md", "packages/core/src/store.ts"],
      outOfScope: [],
    });
  });

  it("returns all in-scope files", () => {
    const result = partitionConflictsByFileScope({
      conflictFiles: ["packages/engine/src/merger.ts", "packages/engine/src/store.ts"],
      declaredScope: ["packages/engine/src/**"],
    });

    expect(result).toEqual({
      inScope: ["packages/engine/src/merger.ts", "packages/engine/src/store.ts"],
      outOfScope: [],
    });
  });

  it("returns all out-of-scope files", () => {
    const result = partitionConflictsByFileScope({
      conflictFiles: ["AGENTS.md", "packages/core/src/store.ts"],
      declaredScope: ["packages/desktop/src/**"],
    });

    expect(result).toEqual({
      inScope: [],
      outOfScope: ["AGENTS.md", "packages/core/src/store.ts"],
    });
  });

  it("partitions mixed files", () => {
    const result = partitionConflictsByFileScope({
      conflictFiles: ["packages/desktop/src/foo.ts", "packages/core/src/store.ts"],
      declaredScope: ["packages/desktop/src/**"],
    });

    expect(result).toEqual({
      inScope: ["packages/desktop/src/foo.ts"],
      outOfScope: ["packages/core/src/store.ts"],
    });
  });

  it("matches glob scope entries", () => {
    const result = partitionConflictsByFileScope({
      conflictFiles: ["packages/core/src/store.ts", "packages/core/test/store.test.ts"],
      declaredScope: ["packages/core/src/**"],
    });

    expect(result).toEqual({
      inScope: ["packages/core/src/store.ts"],
      outOfScope: ["packages/core/test/store.test.ts"],
    });
  });

  it("supports .changeset patterns", () => {
    const result = partitionConflictsByFileScope({
      conflictFiles: [".changeset/fn-4956.md", "AGENTS.md"],
      declaredScope: [".changeset/*"],
    });

    expect(result).toEqual({
      inScope: [".changeset/fn-4956.md"],
      outOfScope: ["AGENTS.md"],
    });
  });
});
