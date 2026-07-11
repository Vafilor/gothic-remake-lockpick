import { describe, expect, test } from "vitest";

import { decodePuzzle, encodePuzzle } from "./share";
import type { PuzzleDefinition } from "./types";

const puzzle: PuzzleDefinition = {
  columnCount: 7,
  targetColumn: 3,
  initialPositions: [1, 5, 3],
  rules: [
    { left: [-1, 1, 0], right: [1, -1, 0] },
    { left: [0, -1, -1], right: [0, 1, 1] },
    { left: [1, 0, -1], right: [-1, 0, 1] },
  ],
};

describe("encode/decode puzzle", () => {
  test("round-trips a puzzle definition", () => {
    expect(decodePuzzle(encodePuzzle(puzzle))).toEqual(puzzle);
  });

  test("returns null for malformed data", () => {
    expect(decodePuzzle("not-base64!!")).toBeNull();
    expect(decodePuzzle(btoa("{}"))).toBeNull();
  });

  test("returns null when required fields have the wrong type", () => {
    const broken = btoa(
      encodeURIComponent(
        JSON.stringify({ ...puzzle, initialPositions: "nope" }),
      ),
    );

    expect(decodePuzzle(broken)).toBeNull();
  });
});
