import { describe, expect, test } from "vitest";

import { solve } from "./solver";
import { applyMove, createGameState, hasWon } from "./engine";
import type { PuzzleDefinition } from "./types";

// Two linked plates: moving plate 1 drags plate 2 the same way.
const linked: PuzzleDefinition = {
  columnCount: 7,
  targetColumn: 3,
  initialPositions: [1, 1],
  rules: [
    { left: [-1, -1], right: [1, 1] },
    { left: [0, -1], right: [0, 1] },
  ],
};

describe("solve", () => {
  test("reports puzzles that are already solved", () => {
    const result = solve(linked, [3, 3]);

    expect(result.status).toBe("already-solved");
    expect(result.moves).toEqual([]);
  });

  test("finds a shortest solution and the moves actually win", () => {
    const result = solve(linked, linked.initialPositions);

    expect(result.status).toBe("solved");
    // From [1,1], two left moves on plate 1 slide both pins right onto slot 4.
    expect(result.moves.length).toBe(2);

    let state = createGameState(linked);
    for (const move of result.moves) {
      state = applyMove(linked, state, move.row, move.direction);
    }
    expect(hasWon(linked, state)).toBe(true);
  });

  test("detects genuinely unsolvable puzzles", () => {
    // Every move shifts both plates by the same amount, so the gap between the
    // two pins is invariant. Starting them one column apart makes it impossible
    // for both to ever sit on the target column together.
    const unsolvable: PuzzleDefinition = {
      columnCount: 3,
      targetColumn: 1,
      initialPositions: [0, 1],
      rules: [
        { left: [-1, -1], right: [1, 1] },
        { left: [-1, -1], right: [1, 1] },
      ],
    };

    const result = solve(unsolvable, unsolvable.initialPositions);

    expect(result.status).toBe("no-solution");
  });

  test("honours an explicit move cap", () => {
    const result = solve(linked, linked.initialPositions, { maxMoves: 1 });

    expect(result.status).toBe("move-cap");
    expect(result.moves).toEqual([]);
  });
});
