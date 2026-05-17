import { describe, expect, it } from "vitest";

import {
  findDuplicateMatches,
  type DuplicateCandidate,
} from "../duplicate-detection.js";

describe("findDuplicateMatches", () => {
  it("returns high-similarity title+description matches", () => {
    const candidates: DuplicateCandidate[] = [
      {
        id: "FN-1",
        title: "Add duplicate task warning",
        description: "Warn before creating duplicate tasks from quick entry",
        column: "todo",
      },
    ];

    const matches = findDuplicateMatches(
      {
        title: "Add duplicate task warning",
        description: "Warn users before creating duplicate tasks in quick entry",
      },
      candidates,
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.score).toBeGreaterThanOrEqual(0.45);
  });

  it("returns no matches for disjoint vocabulary", () => {
    const candidates: DuplicateCandidate[] = [
      {
        id: "FN-2",
        title: "Refactor retry scheduler",
        description: "Adjust heartbeat retry backoff windows",
        column: "todo",
      },
    ];

    const matches = findDuplicateMatches(
      {
        title: "Fix dashboard modal overlap",
        description: "Improve mobile stacking for duplicate warning modal",
      },
      candidates,
    );

    expect(matches).toEqual([]);
  });

  it("keeps identical-title candidates above threshold despite differing body", () => {
    const candidates: DuplicateCandidate[] = [
      {
        id: "FN-3",
        title: "Duplicate warning route",
        description: "Completely unrelated body words for testing",
        column: "in-progress",
      },
    ];

    const matches = findDuplicateMatches(
      {
        title: "Duplicate warning route",
        description: "Different details entirely for this draft",
      },
      candidates,
    );

    expect(matches).toHaveLength(1);
  });

  it("honors excludeColumns defaults and overrides", () => {
    const doneCandidate: DuplicateCandidate = {
      id: "FN-4",
      title: "Duplicate warning route",
      description: "Warn before creating duplicate tasks",
      column: "done",
    };

    const input = {
      title: "Duplicate warning route",
      description: "Warn before creating duplicate tasks",
    };

    expect(findDuplicateMatches(input, [doneCandidate])).toEqual([]);

    const included = findDuplicateMatches(input, [doneCandidate], {
      excludeColumns: [],
    });
    expect(included).toHaveLength(1);
  });

  it("applies ranking order and limit", () => {
    const candidates: DuplicateCandidate[] = [
      {
        id: "FN-5",
        title: "Duplicate warning route",
        description: "Warn before creating duplicate tasks from quick entry",
        column: "todo",
      },
      {
        id: "FN-6",
        title: "Task creation warning",
        description: "Warn before task creation",
        column: "todo",
      },
      {
        id: "FN-7",
        title: "Duplicate task matching",
        description: "Use tokenized matching for duplicate warnings",
        column: "todo",
      },
    ];

    const matches = findDuplicateMatches(
      {
        title: "Duplicate warning route",
        description: "Warn before creating duplicate tasks from quick entry",
      },
      candidates,
      { limit: 2, threshold: 0.15 },
    );

    expect(matches).toHaveLength(2);
    expect(matches[0]?.score).toBeGreaterThanOrEqual(matches[1]?.score ?? 0);
    expect(matches[0]?.id).toBe("FN-5");
  });

  it("returns empty for empty description", () => {
    const candidates: DuplicateCandidate[] = [
      {
        id: "FN-8",
        title: "Duplicate warning route",
        description: "Warn before creating duplicate tasks",
        column: "todo",
      },
    ];

    const matches = findDuplicateMatches(
      {
        title: "Anything",
        description: "   ",
      },
      candidates,
    );

    expect(matches).toEqual([]);
  });
});
